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

test('importing a backup of the same account does not duplicate existing IDs',()=>{
  const cloud=sync.blankWorkspace();cloud.tasks=[emptyTask('Existing','same-id')];
  const merged=sync.mergeDevice(cloud,cloud,{},()=>{throw Error('Should not allocate another ID');});
  assert.equal(merged.tasks.length,1);assert.equal(merged.tasks[0].id,'same-id');
});
