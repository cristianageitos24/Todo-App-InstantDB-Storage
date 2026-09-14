import {isWorkspace} from './organizer';
export type Priority = 'High' | 'Medium' | 'Low';
export type Step = { id: string; title: string; done: boolean; parentId: string | null };
export type WorkTask = { id: string; title: string; project: string; priority: Priority; done: boolean; dueAt: string; remindAt: string; notifiedAt: string; minutes: number; body: string; steps: Step[]; noteId: string | null; createdAt: string; completedAt: string; sample?: boolean };
export type WorkNote = { id: string; title: string; body: string; createdAt: string; sample?: boolean };
export type Alert = { id: string; taskId: string | null; title: string; at: string; read: boolean };
export type WorkState = { version: 2; tasks: WorkTask[]; notes: WorkNote[]; projects: string[]; alerts: Alert[]; name: string; timer: { taskId: string; remaining: number; endsAt: number | null } | null };
export const WORK_KEY = 'workroom.workspace.v2';
export function localDateTime(offset = 0, hour = 16): string { const date = new Date(); date.setDate(date.getDate() + offset); date.setHours(hour, 0, 0, 0); return toLocalDateTime(date); }
export function toLocalDateTime(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }
export function emptyTask(title: string, id: string): WorkTask { return { id, title, project: 'General', priority: 'Medium', done: false, dueAt: '', remindAt: '', notifiedAt: '', minutes: 25, body: '', steps: [], noteId: null, createdAt: new Date().toISOString(), completedAt: '' }; }
export function seedWorkroom(): WorkState {
  const note: WorkNote = { id: 'sample-note', title: 'Website kickoff · Action items', body: 'Objective\nGet the first version ready for review next week.\n\nDiscussion\nKeep the scope focused. Confirm the content before moving into design. Share one update with clear next steps.\n\nDecisions\n• Start with the homepage and services page.\n• Collect feedback in one place.\n\nFour action items from this meeting are linked below.', createdAt: new Date().toISOString(), sample: true };
  const make = (id:string,title:string,project:string,priority:Priority,offset:number,minutes:number):WorkTask=>({...emptyTask(title,id),project,priority,dueAt:localDateTime(offset),minutes,sample:true,noteId:note.id});
  return { version:2,name:'Cristian',projects:['General','Website refresh','Client work','Operations'],alerts:[],timer:null,notes:[note],tasks:[
    {...make('sample-1','Prepare the website project brief','Website refresh','High',0,45),body:'Turn the kickoff discussion into a clear brief. Keep the first version concise and send it for review.',steps:[{id:'step-1',title:'Summarize the goals and audience',done:true,parentId:null},{id:'step-2',title:'Outline the pages we need',done:false,parentId:null},{id:'step-3',title:'Homepage',done:false,parentId:'step-2'},{id:'step-4',title:'Services page',done:false,parentId:'step-2'},{id:'step-5',title:'Send the brief for feedback',done:false,parentId:null}]},
    make('sample-2','Follow up on the content and brand assets','Client work','High',0,15),
    {...make('sample-3','Put together a first-pass project timeline','Website refresh','Medium',1,30),steps:[{id:'step-6',title:'Break the work into milestones',done:false,parentId:null},{id:'step-7',title:'Estimate time for each milestone',done:false,parentId:null}]},
    make('sample-4','Send the team a recap and next steps','Operations','Medium',2,15),
    {...emptyTask('Look into a better way to organize shared files','sample-5'),project:'Operations',priority:'Low',sample:true},
    {...make('sample-6','Collect the notes from our last check-in','Client work','Low',0,10),done:true,completedAt:new Date().toISOString(),noteId:null}
  ] };
}
export function parseCapture(text: string): {title:string; indent:number}[] {
  const lines=text.split('\n').filter(l=>l.trim());if(!lines.length)return [];
  const indent=(line:string)=>(line.match(/^\s*/)?.[0]||'').replace(/\t/g,'  ').length;
  const base=Math.min(...lines.map(indent));
  return lines.map(line=>({title:line.trim().replace(/^(?:[-*•]\s*|\d+[.)]\s*)(?:\[[ xX]\]\s*)?/,'').slice(0,300),indent:Math.max(0,indent(line)-base)})).filter(l=>l.title);
}
export function captureTasks(text:string,options:{project:string;priority:Priority;dueAt:string;remindAt:string;noteId:string|null},id:()=>string):WorkTask[]{
  const result:WorkTask[]=[];let parents:{indent:number;id:string}[]=[];
  for(const line of parseCapture(text)){
    if(line.indent===0||!result.length){result.push({...emptyTask(line.title,id()),...options});parents=[];}
    else{while(parents.length&&parents[parents.length-1].indent>=line.indent)parents.pop();const step:Step={id:id(),title:line.title,done:false,parentId:parents[Math.min(parents.length,39)-1]?.id||null};result[result.length-1].steps.push(step);parents.push({indent:line.indent,id:step.id});}
  }return result;
}
export function descendantIds(steps:Step[],id:string):Set<string>{const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const s of steps)if(s.parentId&&ids.has(s.parentId)&&!ids.has(s.id)){ids.add(s.id);changed=true;}}return ids;}
export function toggleStep(steps:Step[],id:string):Step[]{const step=steps.find(s=>s.id===id);if(!step)return steps;const done=!step.done;const ids=descendantIds(steps,id);let next=steps.map(s=>ids.has(s.id)?{...s,done}:s);if(!done){let parent=step.parentId;const visited=new Set<string>();while(parent&&!visited.has(parent)){visited.add(parent);const p=next.find(s=>s.id===parent);next=next.map(s=>s.id===parent?{...s,done:false}:s);parent=p?.parentId||null;}}return next;}
export function dueReminders(tasks:WorkTask[],now:number):WorkTask[]{return tasks.filter(t=>!t.done&&!!t.remindAt&&!t.notifiedAt&&new Date(t.remindAt).getTime()<=now);}
export function isWorkState(v:unknown):v is WorkState {
  if(!v||typeof v!=='object')return false;
  const w=v as WorkState;
  const date=(v:unknown)=>typeof v==='string'&&(!v||Number.isFinite(Date.parse(v)));
  const nonempty=(v:unknown)=>typeof v==='string'&&!!v.trim();
  const unique=(xs:string[])=>new Set(xs).size===xs.length;
  const sample=(v:unknown)=>v===undefined||typeof v==='boolean';
  if(w.version!==2||typeof w.name!=='string'||!Array.isArray(w.projects)||!w.projects.every(nonempty)||!w.projects.includes('General')||!unique(w.projects)||!Array.isArray(w.tasks)||!Array.isArray(w.notes)||!Array.isArray(w.alerts))return false;
  if(!w.notes.every(n=>n&&nonempty(n.id)&&typeof n.title==='string'&&typeof n.body==='string'&&nonempty(n.createdAt)&&date(n.createdAt)&&sample(n.sample))||!unique(w.notes.map(n=>n.id)))return false;
  if(!w.tasks.every(t=>t&&nonempty(t.id)&&typeof t.title==='string'&&typeof t.body==='string'&&w.projects.includes(t.project)&&['High','Medium','Low'].includes(t.priority)&&typeof t.done==='boolean'&&date(t.dueAt)&&date(t.remindAt)&&date(t.notifiedAt)&&nonempty(t.createdAt)&&date(t.createdAt)&&date(t.completedAt)&&(t.noteId===null||w.notes.some(n=>n.id===t.noteId))&&typeof t.minutes==='number'&&Number.isFinite(t.minutes)&&t.minutes>=1&&t.minutes<=600&&sample(t.sample)&&Array.isArray(t.steps)&&t.steps.every(s=>s&&nonempty(s.id)&&typeof s.title==='string'&&typeof s.done==='boolean'&&(s.parentId===null||typeof s.parentId==='string'))))return false;
  for(const t of w.tasks){
    const byId=new Map(t.steps.map(s=>[s.id,s]));
    if(byId.size!==t.steps.length)return false;
    for(const s of t.steps){const seen=new Set([s.id]);let p=s.parentId;while(p!==null){if(seen.has(p)||!byId.has(p)||seen.size>40)return false;seen.add(p);p=byId.get(p)!.parentId;}}
  }
  return unique(w.tasks.map(t=>t.id))&&w.alerts.every(a=>a&&nonempty(a.id)&&(a.taskId===null||typeof a.taskId==='string')&&typeof a.title==='string'&&nonempty(a.at)&&date(a.at)&&typeof a.read==='boolean')&&unique(w.alerts.map(a=>a.id))&&(w.timer===null||(!!w.timer&&w.tasks.some(t=>t.id===w.timer!.taskId&&!t.done)&&typeof w.timer.remaining==='number'&&Number.isFinite(w.timer.remaining)&&w.timer.remaining>=0&&w.timer.remaining<=36000&&(w.timer.endsAt===null||(typeof w.timer.endsAt==='number'&&Number.isFinite(w.timer.endsAt)&&w.timer.endsAt>0))));
}

export function migrateDaylight(value:unknown):WorkState {
  if(!isWorkspace(value))throw new Error('Invalid Daylight workspace');
  const next=seedWorkroom();next.name=value.name;
  // Keep every existing task, including examples that the user may have edited.
  next.tasks=value.tasks.map(t=>({...emptyTask(t.title,t.id),dueAt:t.date?`${t.date}T17:00`:'',minutes:Math.min(600,Math.max(1,t.minutes||25)),body:t.notes,priority:t.priority==='High'?'High':'Medium',done:t.done,completedAt:t.completedOn?`${t.completedOn}T17:00`:'',project:t.area==='Work'?'General':t.area}));
  next.projects=Array.from(new Set(['General',...next.tasks.map(t=>t.project)]));
  next.notes=[];
  if(value.note)next.notes.push({id:'daylight-notes',title:'Notes from Daylight',body:value.note,createdAt:new Date().toISOString()});
  if(value.intention||value.review.length)next.notes.push({id:'daylight-review',title:'Daylight intention and review',body:[value.intention,...value.review].filter(Boolean).join('\n'),createdAt:new Date().toISOString()});
  if(!isWorkState(next))throw new Error('Invalid migrated workspace');
  return next;
}
