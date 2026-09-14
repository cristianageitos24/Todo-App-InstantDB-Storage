import {isWorkspace} from './organizer';
export type Priority = 'High' | 'Medium' | 'Low';
export type RepeatFreq = 'weekly' | 'weekdays' | 'biweekly' | 'monthly';
export type Step = { id: string; title: string; done: boolean; parentId: string | null };
export type WorkTask = { id: string; title: string; project: string; priority: Priority; done: boolean; dueAt: string; remindAt: string; notifiedAt: string; minutes: number; body: string; steps: Step[]; noteId: string | null; createdAt: string; completedAt: string; sample?: boolean; today?: string; repeat?: RepeatFreq | ''; seriesId?: string };
export type WorkNote = { id: string; title: string; body: string; createdAt: string; datedAt?: string; sample?: boolean };
export const REPEAT_OPTIONS: {value: RepeatFreq | ''; label: string}[] = [
  {value: '', label: 'Does not repeat'},
  {value: 'weekly', label: 'Weekly'},
  {value: 'weekdays', label: 'Every weekday'},
  {value: 'biweekly', label: 'Every 2 weeks'},
  {value: 'monthly', label: 'Monthly'},
];
const REPEAT_FREQS: RepeatFreq[] = ['weekly', 'weekdays', 'biweekly', 'monthly'];
const PROJECT_ACCENTS = ['#536945', '#7c5e2f', '#5c617e', '#486968', '#6b5344', '#3d5c4a', '#7a5a3a', '#4a5d6b'];
export type Alert = { id: string; taskId: string | null; title: string; at: string; read: boolean };
export type WorkState = { version: 2; tasks: WorkTask[]; notes: WorkNote[]; projects: string[]; alerts: Alert[]; name: string; timer: { taskId: string; remaining: number; endsAt: number | null } | null };
export const WORK_KEY = 'workroom.workspace.v2';
export function localDateTime(offset = 0, hour = 16): string { const date = new Date(); date.setDate(date.getDate() + offset); date.setHours(hour, 0, 0, 0); return toLocalDateTime(date); }
export function toLocalDateTime(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }
export function emptyTask(title: string, id: string): WorkTask { return { id, title, project: 'General', priority: 'Medium', done: false, dueAt: '', remindAt: '', notifiedAt: '', minutes: 25, body: '', steps: [], noteId: null, createdAt: new Date().toISOString(), completedAt: '' }; }
export function seedWorkroom(): WorkState {
  const note: WorkNote = { id: 'sample-note', title: 'Website kickoff · Action items', body: 'Objective\nGet the first version ready for review next week.\n\nDiscussion\nKeep the scope focused. Confirm the content before moving into design. Share one update with clear next steps.\n\nDecisions\n• Start with the homepage and services page.\n• Collect feedback in one place.\n\nFour action items from this meeting are linked below.', createdAt: new Date().toISOString(), datedAt: toLocalDateTime(new Date()).slice(0, 10), sample: true };
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
  const dayKey=(v:unknown)=>typeof v==='string'&&(v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&date(v)));
  const repeat=(v:unknown)=>v===undefined||v===''||(typeof v==='string'&&(REPEAT_FREQS as string[]).includes(v));
  if(w.version!==2||typeof w.name!=='string'||!Array.isArray(w.projects)||!w.projects.every(nonempty)||!w.projects.includes('General')||!unique(w.projects)||!Array.isArray(w.tasks)||!Array.isArray(w.notes)||!Array.isArray(w.alerts))return false;
  if(!w.notes.every(n=>n&&nonempty(n.id)&&typeof n.title==='string'&&typeof n.body==='string'&&nonempty(n.createdAt)&&date(n.createdAt)&&(n.datedAt===undefined||dayKey(n.datedAt))&&sample(n.sample))||!unique(w.notes.map(n=>n.id)))return false;
  if(!w.tasks.every(t=>t&&nonempty(t.id)&&typeof t.title==='string'&&typeof t.body==='string'&&w.projects.includes(t.project)&&['High','Medium','Low'].includes(t.priority)&&typeof t.done==='boolean'&&date(t.dueAt)&&date(t.remindAt)&&date(t.notifiedAt)&&nonempty(t.createdAt)&&date(t.createdAt)&&date(t.completedAt)&&(t.noteId===null||w.notes.some(n=>n.id===t.noteId))&&typeof t.minutes==='number'&&Number.isFinite(t.minutes)&&t.minutes>=1&&t.minutes<=600&&sample(t.sample)&&(t.today===undefined||dayKey(t.today))&&repeat(t.repeat)&&(t.seriesId===undefined||typeof t.seriesId==='string')&&Array.isArray(t.steps)&&t.steps.every(s=>s&&nonempty(s.id)&&typeof s.title==='string'&&typeof s.done==='boolean'&&(s.parentId===null||typeof s.parentId==='string'))))return false;
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

export const MEETING_TEMPLATE = 'Decisions\n\n\nOpen questions\n';
export function matchingNotes(notes: WorkNote[], search: string): WorkNote[] {
  const query = search.trim().toLowerCase();
  return notes.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export function isTodayTask(task: WorkTask, day: string): boolean { return !task.done && task.today === day; }

const calendarPriority = {High: 0, Medium: 1, Low: 2};
export function calendarDay(dueAt: string): string {
  return dueAt ? dueAt.slice(0, 10) : '';
}
export function dueAtForDay(day: string, hour = 16): string {
  return day ? `${day}T${String(hour).padStart(2, '0')}:00` : '';
}
export function dueTimeLabel(dueAt: string): string {
  const match = dueAt.match(/T(\d{2}):(\d{2})/);
  if (!match || (match[1] === '00' && match[2] === '00')) return '';
  const hour = Number(match[1]) % 12 || 12;
  return `${hour}:${match[2]} ${Number(match[1]) >= 12 ? 'PM' : 'AM'}`;
}
export function sortCalendarTasks(tasks: WorkTask[]): WorkTask[] {
  return [...tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt) || calendarPriority[a.priority] - calendarPriority[b.priority]);
}
export function tasksOnDay(tasks: WorkTask[], day: string, hideCompleted = false): WorkTask[] {
  return sortCalendarTasks(tasks.filter(t => calendarDay(t.dueAt) === day && (!hideCompleted || !t.done)));
}
export function overdueOnCalendar(tasks: WorkTask[], now: number): WorkTask[] {
  return tasks.filter(t => !t.done && !!t.dueAt && new Date(t.dueAt).getTime() < now).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
export function unscheduledCount(tasks: WorkTask[]): number {
  return unscheduledTasks(tasks).length;
}
export function unscheduledTasks(tasks: WorkTask[]): WorkTask[] {
  return tasks.filter(t => !t.done && !t.dueAt);
}
export function monthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({length: firstWeekday}, () => null);
  for (let d = 1; d <= lastDate; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function shiftCalendarDay(day: string, monthDelta: number): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7)) - 1;
  const date = Number(day.slice(8, 10));
  const next = new Date(year, month + monthDelta, 1);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(Math.min(date, last)).padStart(2, '0')}`;
}
export function calendarChipLabel(task: WorkTask, noteTitle?: string): string {
  const due = dueTimeLabel(task.dueAt);
  const note = noteTitle ? `, linked note ${noteTitle}` : '';
  return `${task.title || 'Untitled task'}${due ? `, due ${due}` : ''}${note}`;
}
export function fromDayKey(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addCalendarDays(day: string, days: number): string {
  if (!day) return '';
  const next = fromDayKey(day);
  next.setDate(next.getDate() + days);
  return toDayKey(next);
}
export function weekDays(anchorDay: string): string[] {
  const start = fromDayKey(anchorDay);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({length: 7}, (_, i) => addCalendarDays(toDayKey(start), i));
}
export function shiftCalendarWeek(day: string, weekDelta: number): string {
  return addCalendarDays(day, weekDelta * 7);
}
export function weekRangeLabel(anchorDay: string): string {
  const days = weekDays(anchorDay);
  const start = fromDayKey(days[0]).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const end = fromDayKey(days[6]).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
  return `${start} – ${end}`;
}
export function rescheduleToDay(dueAt: string, day: string): string {
  if (!day) return '';
  const time = dueAt.match(/T(\d{2}:\d{2})/)?.[1] || '16:00';
  return `${day}T${time}`;
}
export function shiftRemindAt(remindAt: string, fromDue: string, toDue: string): string {
  if (!remindAt || !fromDue || !toDue) return remindAt;
  const fromDay = calendarDay(fromDue);
  const toDay = calendarDay(toDue);
  const remindDay = calendarDay(remindAt);
  if (!fromDay || !toDay || !remindDay || fromDay === toDay) return remindAt;
  const delta = Math.round((fromDayKey(toDay).getTime() - fromDayKey(fromDay).getTime()) / 86400000);
  return rescheduleToDay(remindAt, addCalendarDays(remindDay, delta));
}
export function applyDueChange(task: WorkTask, dueAt: string): Partial<WorkTask> {
  if (!dueAt) return {dueAt: ''};
  const remindAt = shiftRemindAt(task.remindAt, task.dueAt, dueAt);
  return remindAt === task.remindAt ? {dueAt} : {dueAt, remindAt, notifiedAt: ''};
}
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}
export function dayLoad(tasks: WorkTask[], day: string): number {
  return tasksOnDay(tasks, day, true).reduce((sum, task) => sum + task.minutes, 0);
}
export function projectAccent(project: string): string {
  if (!project || project === 'General') return '';
  let hash = 0;
  for (let i = 0; i < project.length; i++) hash = (hash * 31 + project.charCodeAt(i)) >>> 0;
  return PROJECT_ACCENTS[hash % PROJECT_ACCENTS.length];
}
export function notesOnDay(notes: WorkNote[], day: string): WorkNote[] {
  return notes.filter(n => n.datedAt === day);
}
export function noteDayLabel(note: WorkNote): string {
  if (note.datedAt) return fromDayKey(note.datedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  return new Date(note.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}
export function isRepeatFreq(value: unknown): value is RepeatFreq {
  return typeof value === 'string' && (REPEAT_FREQS as string[]).includes(value);
}
export function nextRepeatDue(dueAt: string, freq: RepeatFreq): string {
  const day = calendarDay(dueAt);
  if (!day) return dueAt;
  if (freq === 'weekly') return rescheduleToDay(dueAt, addCalendarDays(day, 7));
  if (freq === 'biweekly') return rescheduleToDay(dueAt, addCalendarDays(day, 14));
  if (freq === 'weekdays') {
    const weekday = fromDayKey(day).getDay();
    const skip = weekday === 5 ? 3 : weekday === 6 ? 2 : 1;
    return rescheduleToDay(dueAt, addCalendarDays(day, skip));
  }
  const monthStart = fromDayKey(day);
  const date = monthStart.getDate();
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() + 1);
  const last = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  monthStart.setDate(Math.min(date, last));
  return rescheduleToDay(dueAt, toDayKey(monthStart));
}
export function skipRepeat(task: WorkTask): Partial<WorkTask> {
  if (!isRepeatFreq(task.repeat) || !task.dueAt) return {};
  return applyDueChange(task, nextRepeatDue(task.dueAt, task.repeat));
}
export function rollRepeatingTask(task: WorkTask, id: string): WorkTask {
  const freq = isRepeatFreq(task.repeat) ? task.repeat : 'weekly';
  const dueAt = nextRepeatDue(task.dueAt, freq);
  return {
    ...emptyTask(task.title, id),
    project: task.project,
    priority: task.priority,
    dueAt,
    remindAt: shiftRemindAt(task.remindAt, task.dueAt, dueAt),
    minutes: task.minutes,
    body: task.body,
    noteId: task.noteId,
    repeat: freq,
    seriesId: task.seriesId || task.id,
    steps: task.steps.map(step => ({...step, done: false})),
  };
}
export function upcomingOccurrences(task: WorkTask, count = 4): string[] {
  if (!isRepeatFreq(task.repeat) || !task.dueAt || task.done) return [];
  const days: string[] = [];
  let due = task.dueAt;
  for (let i = 0; i < count; i++) {
    due = nextRepeatDue(due, task.repeat);
    days.push(calendarDay(due));
  }
  return days;
}
export function ghostsOnDay(tasks: WorkTask[], day: string): WorkTask[] {
  return tasks.filter(t => upcomingOccurrences(t, 4).includes(day));
}
