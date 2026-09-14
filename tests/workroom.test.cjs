const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {emptyTask,captureTasks,parseCapture,toggleStep,descendantIds,dueReminders,isWorkState,seedWorkroom,migrateDaylight}=require(join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
const {initialWorkspace}=require(join(process.env.WORKROOM_TEST_BUILD,'organizer.js'));
const options={project:'General',priority:'High',dueAt:'2026-09-14T16:00',remindAt:'2026-09-14T15:00',noteId:null};
let id=0;const uuid=()=>String(++id);
test('four meeting tasks retain nested checklist structure and shared schedule',()=>{
 const tasks=captureTasks('Prepare brief\n  Goals\n    Ask client\n  Pages\nCollect content\nBuild timeline\nSend recap',options,uuid);
 assert.equal(tasks.length,4);assert.equal(tasks[0].steps.length,3);
 assert.equal(tasks[0].steps[1].parentId,tasks[0].steps[0].id);
 assert.equal(tasks[0].steps[2].parentId,null);
 assert.ok(tasks.every(t=>t.priority==='High'&&t.remindAt===options.remindAt));
});
test('capture accepts bullets, tabs, blank lines, and commonly indented paste',()=>{
 const tasks=captureTasks('  - First\n\t\t- [ ] Child\n\n  2. Second',options,uuid);
 assert.equal(tasks.length,2);assert.equal(tasks[0].steps[0].title,'Child');
 assert.deepEqual(parseCapture('  \n- \n'),[]);
});
test('checking a parent completes descendants; reopening a child reopens ancestors',()=>{
 const steps=captureTasks('Task\n  Parent\n    Child\n  Other',options,uuid)[0].steps;
 const done=toggleStep(steps,steps[0].id);assert.deepEqual(done.map(s=>s.done),[true,true,false]);
 assert.deepEqual(toggleStep(done,steps[1].id).map(s=>s.done),[false,false,false]);
 assert.equal(descendantIds(steps,steps[0].id).size,2);assert.equal(steps[0].done,false);
});
test('reminders ignore completed, future, and already delivered tasks; snooze re-arms',()=>{
 const base=captureTasks('A\nB\nC\nD',options,uuid);
 base[1].done=true;base[2].notifiedAt='2026-09-14T15:01:00';base[3].remindAt='2026-09-15T15:00';
 const now=new Date('2026-09-14T15:05').getTime();
 assert.deepEqual(dueReminders(base,now).map(t=>t.title),['A']);
 base[0].notifiedAt=new Date(now).toISOString();assert.equal(dueReminders(base,now).length,0);
 base[0].notifiedAt='';base[0].remindAt='2026-09-14T15:15';
 assert.equal(dueReminders(base,now).length,0);assert.equal(dueReminders(base,now+10*60000).length,1);
});
test('backup roundtrip accepts persisted timer and rejects invalid structures',()=>{
 const seed=seedWorkroom();seed.timer={taskId:seed.tasks[0].id,remaining:1500,endsAt:Date.now()+1500000};
 assert.ok(isWorkState(JSON.parse(JSON.stringify(seed))));
 for(const mutate of [s=>s.tasks.push(s.tasks[0]),s=>s.tasks[0].steps[0].parentId='missing',s=>s.tasks[0].steps[0].parentId=s.tasks[0].steps[0].id,s=>s.tasks[0].minutes=Infinity,s=>s.tasks[0].remindAt='bad date',s=>s.timer.taskId='missing',s=>s.timer.endsAt='tomorrow',s=>s.notes.push(s.notes[0]),s=>s.tasks[0].noteId='missing',s=>s.projects=[],s=>s.tasks[0].sample='yes']){
 const invalid=structuredClone(seed);mutate(invalid);assert.equal(isWorkState(invalid),false);
 }
 assert.equal(isWorkState(null),false);assert.equal(isWorkState({version:2}),false);
});
test('Daylight migration preserves all tasks, edited examples, notes, and review without mutating source',()=>{
 const old=initialWorkspace();old.tasks[0].title='My edited brief';old.note='Meeting context';old.review=['Follow up'];
 const before=JSON.stringify(old);const migrated=migrateDaylight(old);
 assert.ok(isWorkState(migrated));assert.equal(migrated.tasks.length,old.tasks.length);
 assert.equal(migrated.tasks[0].title,'My edited brief');assert.equal(migrated.tasks[0].sample,undefined);
 assert.equal(migrated.notes.length,2);assert.equal(JSON.stringify(old),before);
 old.tasks=[];assert.equal(migrateDaylight(old).tasks.length,0);
 assert.throws(()=>migrateDaylight({tasks:[]}));
});

const sync=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom-sync.js'));
test('cloud mapping keeps legacy identities and follow-up context',()=>{
  const state=sync.decodeCloud({todos:[{id:'legacy-id',text:'Send proposal',completed:false,createdDate:'2026-09-01T10:00:00Z',userId:'owner',followUp:{notes:'Client context',dateTime:'2026-09-15T10:00:00'}}],userProfiles:[{id:'profile',displayName:'Chris'}]}, {alerts:[],timer:null});
  assert.equal(state.tasks[0].id,'legacy-id');assert.equal(state.tasks[0].body,'Client context');assert.equal(state.name,'Chris');assert.equal(state.tasks[0].remindAt,'');
});
test('cloud edits update only changed fields and never write unrelated tasks',()=>{
  const before=sync.blankWorkspace();before.tasks=[emptyTask('One','one'),emptyTask('Two','two')];
  const after={...before,tasks:before.tasks.map(t=>t.id==='one'?{...t,today:'2026-09-13'}:t)};
  assert.deepEqual(sync.cloudChanges(before,after,'user','profile'),[{entity:'todos',id:'one',values:{today:'2026-09-13'}}]);
  const rows={todos:[{id:'one',text:'Remote title',today:''},{id:'two',text:'Two'}]};
  assert.equal(sync.overlayCloud(rows,sync.cloudChanges(before,after,'user','profile')).todos[0].text,'Remote title');
});
test('device import retries retain note links without duplicating or replacing cloud work',()=>{
  const device=sync.blankWorkspace();device.notes=[{id:'old-note',title:'Meeting',body:'Decision',createdAt:new Date().toISOString()}];device.tasks=[{...emptyTask('Send draft','old-task'),noteId:'old-note'}];
  const cloud=sync.blankWorkspace();cloud.tasks=[emptyTask('Existing','cloud-task')];const ids={};let n=0;
  const first=sync.mergeDevice(cloud,device,ids,()=>`mapped-${++n}`);
  const second=sync.mergeDevice(first,device,ids,()=>`mapped-${++n}`);
  assert.equal(second.tasks.length,2);assert.equal(second.notes.length,1);assert.equal(second.tasks[1].noteId,second.notes[0].id);assert.equal(n,2);
});
test('Today expires independently of task completion or deadline',()=>{
  const {isTodayTask}=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
  const task={...emptyTask('Send draft','task'),today:'2026-09-13',dueAt:'2026-09-20T10:00'};
  assert.equal(isTodayTask(task,'2026-09-13'),true);assert.equal(isTodayTask(task,'2026-09-14'),false);assert.equal(task.dueAt,'2026-09-20T10:00');assert.equal(task.done,false);
});
test('note search includes body text and sorts recent notes first',()=>{
  const {matchingNotes}=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
  const notes=[{id:'one',title:'Meeting',body:'Agreed on the homepage',createdAt:'2026-09-01'},{id:'two',title:'Homepage review',body:'',createdAt:'2026-09-12'}];
  assert.deepEqual(matchingNotes(notes,' HOMEPAGE ').map(n=>n.id),['two','one']);
});

test('calendar groups due dates by local day, hides completed, and lists oldest overdue first',()=>{
  const {calendarDay,dueAtForDay,dueTimeLabel,tasksOnDay,overdueOnCalendar,unscheduledCount,monthGrid,shiftCalendarDay,calendarChipLabel}=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
  const dated=[
    {...emptyTask('High later','a'),dueAt:'2026-09-14T17:00',priority:'High'},
    {...emptyTask('Medium first','b'),dueAt:'2026-09-14T09:30',priority:'Medium'},
    {...emptyTask('Done same day','c'),dueAt:'2026-09-14T08:00',done:true,completedAt:'2026-09-14T12:00'},
    {...emptyTask('Overdue','d'),dueAt:'2026-09-10T16:00'},
    {...emptyTask('Undated','e')},
  ];
  assert.equal(calendarDay('2026-09-14T16:00'),'2026-09-14');
  assert.equal(dueAtForDay('2026-09-14'),'2026-09-14T16:00');
  assert.equal(dueTimeLabel('2026-09-14T16:00'),'4:00 PM');
  assert.equal(dueTimeLabel('2026-09-14T00:00'),'');
  assert.deepEqual(tasksOnDay(dated,'2026-09-14').map(t=>t.id),['c','b','a']);
  assert.deepEqual(tasksOnDay(dated,'2026-09-14',true).map(t=>t.id),['b','a']);
  assert.deepEqual(overdueOnCalendar(dated,new Date('2026-09-14T08:00').getTime()).map(t=>t.id),['d']);
  assert.equal(unscheduledCount(dated),1);
  assert.equal(monthGrid(2026,8).filter(Boolean)[0],'2026-09-01');
  assert.equal(shiftCalendarDay('2026-01-31',-1),'2025-12-31');
  assert.equal(calendarChipLabel(dated[1],'Kickoff'),'Medium first, due 9:30 AM, linked note Kickoff');
});

test('week days, reschedule, reminders, load, and project accents stay on local dates',()=>{
  const {weekDays,shiftCalendarWeek,rescheduleToDay,shiftRemindAt,applyDueChange,dayLoad,formatMinutes,projectAccent,notesOnDay}=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
  assert.deepEqual(weekDays('2026-09-16'),['2026-09-13','2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19']);
  assert.equal(shiftCalendarWeek('2026-09-16',1),'2026-09-23');
  assert.equal(rescheduleToDay('2026-09-14T09:30','2026-09-17'),'2026-09-17T09:30');
  assert.equal(rescheduleToDay('','2026-09-17'),'2026-09-17T16:00');
  assert.equal(shiftRemindAt('2026-09-14T08:00','2026-09-14T16:00','2026-09-16T16:00'),'2026-09-16T08:00');
  assert.equal(shiftRemindAt('2026-09-14T08:00','2026-09-14T16:00','2026-09-14T18:00'),'2026-09-14T08:00');
  const moved=applyDueChange({...emptyTask('A','a'),dueAt:'2026-09-14T09:30',remindAt:'2026-09-14T08:00'},'2026-09-17T09:30');
  assert.equal(moved.dueAt,'2026-09-17T09:30');
  assert.equal(moved.remindAt,'2026-09-17T08:00');
  const loadTasks=[{...emptyTask('A','a'),dueAt:'2026-09-14T09:00',minutes:45},{...emptyTask('B','b'),dueAt:'2026-09-14T10:00',minutes:30,done:true}];
  assert.equal(dayLoad(loadTasks,'2026-09-14'),45);
  assert.equal(formatMinutes(135),'2h 15m');
  assert.equal(projectAccent('General'),'');
  assert.ok(projectAccent('Website refresh'));
  assert.equal(projectAccent('Website refresh'),projectAccent('Website refresh'));
  assert.deepEqual(notesOnDay([{id:'n',title:'Kickoff',body:'',createdAt:'2026-09-01',datedAt:'2026-09-14'}],'2026-09-14').map(n=>n.id),['n']);
  assert.deepEqual(notesOnDay([{id:'n',title:'Kickoff',body:'',createdAt:'2026-09-14'}],'2026-09-14'),[]);
});

test('repeating tasks roll locally, skip one occurrence, and only ghost future dates',()=>{
  const {nextRepeatDue,skipRepeat,rollRepeatingTask,upcomingOccurrences,ghostsOnDay}=require(require('node:path').join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
  assert.equal(nextRepeatDue('2026-09-14T16:00','weekly'),'2026-09-21T16:00');
  assert.equal(nextRepeatDue('2026-09-18T09:00','weekdays'),'2026-09-21T09:00');
  assert.equal(nextRepeatDue('2026-01-31T16:00','monthly'),'2026-02-28T16:00');
  const weekly={...emptyTask('Standup','live'),dueAt:'2026-09-14T09:00',remindAt:'2026-09-14T08:30',repeat:'weekly',steps:[{id:'s',title:'Prep',done:true,parentId:null}]};
  assert.equal(skipRepeat(weekly).dueAt,'2026-09-21T09:00');
  assert.equal(skipRepeat(weekly).remindAt,'2026-09-21T08:30');
  const next=rollRepeatingTask(weekly,'next');
  assert.equal(next.id,'next');
  assert.equal(next.dueAt,'2026-09-21T09:00');
  assert.equal(next.seriesId,'live');
  assert.equal(next.steps[0].done,false);
  assert.deepEqual(upcomingOccurrences(weekly,2),['2026-09-21','2026-09-28']);
  assert.deepEqual(ghostsOnDay([weekly],'2026-09-21').map(t=>t.id),['live']);
  assert.deepEqual(ghostsOnDay([weekly],'2026-09-14'),[]);
});

test('cloud mapping keeps meeting dates and repeat fields',()=>{
  const state=sync.decodeCloud({todos:[{id:'legacy-id',text:'Weekly recap',completed:false,createdDate:'2026-09-01T10:00:00Z',userId:'owner',followUp:{notes:'',dateTime:'2026-09-15T10:00:00'},repeat:'weekly',seriesId:'legacy-id'}],workroomNotes:[{id:'note',title:'Kickoff',body:'',createdAt:'2026-09-01T10:00:00Z',datedAt:'2026-09-14'}],userProfiles:[{id:'profile',displayName:'Chris'}]}, {alerts:[],timer:null});
  assert.equal(state.tasks[0].repeat,'weekly');
  assert.equal(state.notes[0].datedAt,'2026-09-14');
  const after={...state,tasks:state.tasks.map(t=>({...t,repeat:'monthly'}))};
  assert.deepEqual(sync.cloudChanges(state,after,'user','profile'),[{entity:'todos',id:'legacy-id',values:{repeat:'monthly'}}]);
});

test('importing a backup of the same account does not duplicate existing IDs',()=>{
  const cloud=sync.blankWorkspace();cloud.tasks=[emptyTask('Existing','same-id')];
  const merged=sync.mergeDevice(cloud,cloud,{},()=>{throw Error('Should not allocate another ID');});
  assert.equal(merged.tasks.length,1);assert.equal(merged.tasks[0].id,'same-id');
});
