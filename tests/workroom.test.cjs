const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {captureTasks,parseCapture,toggleStep,descendantIds,dueReminders,isWorkState,seedWorkroom,migrateDaylight}=require(join(process.env.WORKROOM_TEST_BUILD,'workroom.js'));
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
