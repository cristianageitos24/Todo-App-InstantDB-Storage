import {isWorkspace} from './organizer';
export type Priority = 'High' | 'Medium' | 'Low';
export type RepeatFreq = 'weekly' | 'weekdays' | 'biweekly' | 'monthly';
export type TaskKind = 'task' | 'meeting' | 'group';
export type Step = { id: string; title: string; done: boolean; parentId: string | null };
export type WorkTask = { id: string; title: string; project: string; priority: Priority; done: boolean; dueAt: string; remindAt: string; notifiedAt: string; minutes: number; body: string; steps: Step[]; noteId: string | null; createdAt: string; completedAt: string; sample?: boolean; today?: string; repeat?: RepeatFreq | ''; seriesId?: string; parentId?: string | null; kind?: TaskKind };
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
export const WORK_NAV_LABELS = ['My work', 'Today', 'Inbox', 'Schedule', 'Priorities', 'Notes', 'Completed', 'Calendar'] as const;
export const DEFAULT_FOCUS_MINUTES = 25;
export function localDateTime(offset = 0, hour = 16): string { const date = new Date(); date.setDate(date.getDate() + offset); date.setHours(hour, 0, 0, 0); return toLocalDateTime(date); }
export function toLocalDateTime(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }
export function emptyTask(title: string, id: string): WorkTask { return { id, title, project: 'General', priority: 'Medium', done: false, dueAt: '', remindAt: '', notifiedAt: '', minutes: 0, body: '', steps: [], noteId: null, createdAt: new Date().toISOString(), completedAt: '', parentId: null, kind: 'task' }; }
export function focusMinutes(minutes: number): number { return minutes >= 1 && minutes <= 600 ? minutes : DEFAULT_FOCUS_MINUTES; }
export function createProjectName(name: string, projects: string[], reserved: readonly string[] = WORK_NAV_LABELS): {ok: true; name: string} | {ok: false; error: string} {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return {ok: false, error: 'Enter a project name.'};
  if ([...reserved, ...projects].some(label => label.toLowerCase() === trimmed.toLowerCase())) return {ok: false, error: 'That name is already in use. Choose another.'};
  return {ok: true, name: trimmed};
}
export function seedWorkroom(): WorkState {
  const note: WorkNote = { id: 'sample-note', title: 'Website kickoff · Action items', body: 'Objective\nGet the first version ready for review next week.\n\nDiscussion\nKeep the scope focused. Confirm the content before moving into design. Share one update with clear next steps.\n\nDecisions\n• Start with the homepage and services page.\n• Collect feedback in one place.\n\nFour action items from this meeting are linked below.', createdAt: new Date().toISOString(), datedAt: toLocalDateTime(new Date()).slice(0, 10), sample: true };
  const meeting: WorkTask = {...emptyTask(note.title,'sample-meeting'),kind:'meeting',project:'Website refresh',noteId:note.id,sample:true};
  const make = (id:string,title:string,project:string,priority:Priority,offset:number,minutes:number):WorkTask=>({...emptyTask(title,id),project,priority,dueAt:localDateTime(offset),minutes,sample:true,noteId:note.id,parentId:meeting.id});
  return { version:2,name:'Cristian',projects:['General','Website refresh','Client work','Operations'],alerts:[],timer:null,notes:[note],tasks:[
    meeting,
    {...make('sample-1','Prepare the website project brief','Website refresh','High',0,45),body:'Turn the kickoff discussion into a clear brief. Keep the first version concise and send it for review.',steps:[{id:'step-1',title:'Summarize the goals and audience',done:true,parentId:null},{id:'step-2',title:'Outline the pages we need',done:false,parentId:null},{id:'step-3',title:'Homepage',done:false,parentId:'step-2'},{id:'step-4',title:'Services page',done:false,parentId:'step-2'},{id:'step-5',title:'Send the brief for feedback',done:false,parentId:null}]},
    make('sample-2','Follow up on the content and brand assets','Client work','High',0,15),
    {...make('sample-3','Put together a first-pass project timeline','Website refresh','Medium',1,30),steps:[{id:'step-6',title:'Break the work into milestones',done:false,parentId:null},{id:'step-7',title:'Estimate time for each milestone',done:false,parentId:null}]},
    make('sample-4','Send the team a recap and next steps','Operations','Medium',2,15),
    {...emptyTask('Look into a better way to organize shared files','sample-5'),project:'Operations',priority:'Low',sample:true},
    {...emptyTask('Collect the notes from our last check-in','sample-6'),project:'Client work',priority:'Low',dueAt:localDateTime(0),minutes:10,sample:true,done:true,completedAt:new Date().toISOString()}
  ] };
}
export function parseCapture(text: string): {title:string; indent:number}[] {
  const lines=text.split('\n').filter(l=>l.trim());if(!lines.length)return [];
  const indent=(line:string)=>(line.match(/^\s*/)?.[0]||'').replace(/\t/g,'  ').length;
  const base=Math.min(...lines.map(indent));
  return lines.map(line=>({title:line.trim().replace(/^(?:[-*•]\s*|\d+[.)]\s*)(?:\[[ xX]\]\s*)?/,'').slice(0,300),indent:Math.max(0,indent(line)-base)})).filter(l=>l.title);
}
export function groupCapturePreview(lines: {title:string; indent:number}[]): {title:string; steps:{title:string; indent:number}[]}[] {
  const groups:{title:string; steps:{title:string; indent:number}[]}[]=[];
  for(const line of lines){
    if(line.indent===0||!groups.length)groups.push({title:line.title,steps:[]});
    else groups[groups.length-1].steps.push(line);
  }
  return groups;
}
export function captureTasks(text:string,options:{project:string;priority:Priority;dueAt:string;remindAt:string;noteId:string|null},id:()=>string):WorkTask[]{
  const result:WorkTask[]=[];let parents:{indent:number;id:string}[]=[];
  for(const line of parseCapture(text)){
    if(line.indent===0||!result.length){result.push({...emptyTask(line.title,id()),...options,kind:'task',parentId:null});parents=[];}
    else{while(parents.length&&parents[parents.length-1].indent>=line.indent)parents.pop();const step:Step={id:id(),title:line.title,done:false,parentId:parents[Math.min(parents.length,39)-1]?.id||null};result[result.length-1].steps.push(step);parents.push({indent:line.indent,id:step.id});}
  }return result;
}
export function asTaskKind(kind: unknown): TaskKind {
  return kind === 'meeting' ? 'meeting' : kind === 'group' ? 'group' : 'task';
}
export function isMeetingTask(task: WorkTask): boolean { return asTaskKind(task.kind) === 'meeting'; }
export function isGroupTask(task: WorkTask): boolean { return asTaskKind(task.kind) === 'group'; }
export function isBundleTask(task: WorkTask): boolean { return isMeetingTask(task) || isGroupTask(task); }
export function isRootTask(task: WorkTask): boolean { return !task.parentId; }
export function canGroupTask(task: WorkTask): boolean { return isRootTask(task) && !isBundleTask(task); }
export function childTasks(tasks: WorkTask[], parentId: string): WorkTask[] { return tasks.filter(t => t.parentId === parentId); }
export function meetingProgress(tasks: WorkTask[], parentId: string): {done: number; total: number} {
  const children = childTasks(tasks, parentId);
  return {done: children.filter(t => t.done).length, total: children.length};
}
export function isMeetingComplete(tasks: WorkTask[], parentId: string): boolean {
  const children = childTasks(tasks, parentId);
  return children.length > 0 && children.every(t => t.done);
}
export function shouldNavigateHomeAfterCreate(_view: string): boolean {
  return false;
}
export function meetingParentForNote(tasks: WorkTask[], noteId: string | null): WorkTask | undefined {
  if (!noteId) return undefined;
  return tasks.find(t => isMeetingTask(t) && t.noteId === noteId && !t.parentId);
}
export function parentTask(tasks: WorkTask[], task: WorkTask): WorkTask | undefined {
  return task.parentId ? tasks.find(t => t.id === task.parentId) : undefined;
}
export function earliestChildDue(tasks: WorkTask[], parentId: string): string {
  return childTasks(tasks, parentId).map(t => t.dueAt).filter(Boolean).sort()[0] || '';
}
export function rootDueAt(task: WorkTask, tasks: WorkTask[]): string {
  return task.dueAt || (isBundleTask(task) ? earliestChildDue(tasks, task.id) : '');
}
export function completeTaskPatch(task: WorkTask, done: boolean, at = new Date().toISOString()): Partial<WorkTask> {
  return {done, completedAt: done ? (task.completedAt || at) : '', ...(done ? {steps: task.steps.map(s => ({...s, done: true}))} : {})};
}
export function syncMeetingParents(tasks: WorkTask[], at = new Date().toISOString()): WorkTask[] {
  return tasks.map(t => {
    if (!isBundleTask(t)) return t;
    const children = childTasks(tasks, t.id);
    const complete = children.length > 0 && children.every(c => c.done);
    if (complete === t.done) return complete ? t : {...t, completedAt: ''};
    return {...t, done: complete, completedAt: complete ? (t.completedAt || at) : ''};
  });
}
export function applyMeetingCompletion(tasks: WorkTask[], parent: WorkTask, done: boolean, at = new Date().toISOString()): WorkTask[] {
  const ids = new Set(childTasks(tasks, parent.id).map(t => t.id));
  return syncMeetingParents(tasks.map(t => {
    if (t.id === parent.id || ids.has(t.id)) return {...t, ...completeTaskPatch(t, done, at)};
    return t;
  }), at);
}
export function groupingProject(tasks: WorkTask[], ids: string[], preferred = ''): string {
  if (preferred.trim()) return preferred.trim();
  const members = ids.map(id => tasks.find(t => t.id === id)).filter((t): t is WorkTask => !!t);
  const projects = Array.from(new Set(members.map(t => t.project)));
  return projects.length === 1 ? projects[0] : 'General';
}
export function selectionSpansProjects(tasks: WorkTask[], ids: string[]): boolean {
  const members = ids.map(id => tasks.find(t => t.id === id)).filter((t): t is WorkTask => !!t);
  return new Set(members.map(t => t.project)).size > 1;
}
export function groupTasks(state: WorkState, ids: string[], title: string, id: () => string, project = ''): {ok: true; state: WorkState; groupId: string} | {ok: false; error: string} {
  const groupable = Array.from(new Set(ids)).filter(taskId => {
    const task = state.tasks.find(t => t.id === taskId);
    return !!task && canGroupTask(task);
  });
  if (groupable.length < 2) return {ok: false, error: 'Select at least two tasks to group.'};
  const groupProject = groupingProject(state.tasks, groupable, project);
  const parent: WorkTask = {...emptyTask(title.trim().slice(0, 80) || 'Untitled group', id()), kind: 'group', project: groupProject};
  const grouped = new Set(groupable);
  return {ok: true, groupId: parent.id, state: {...state, tasks: syncMeetingParents([parent, ...state.tasks.map(t => grouped.has(t.id) ? {...t, parentId: parent.id, project: groupProject} : t)])}};
}
export function ungroupTasks(state: WorkState, groupId: string): WorkState {
  const parent = state.tasks.find(t => t.id === groupId);
  if (!parent || !isGroupTask(parent)) return state;
  return {...state, tasks: syncMeetingParents(state.tasks.filter(t => t.id !== groupId).map(t => t.parentId === groupId ? {...t, parentId: null} : t))};
}
export function addBundleChild(state: WorkState, parentId: string, title: string, id: () => string): WorkState {
  const parent = state.tasks.find(t => t.id === parentId);
  if (!parent || !isBundleTask(parent)) return state;
  const task = {...emptyTask(title.trim() || (isMeetingTask(parent) ? 'New action item' : 'New task'), id()), project: parent.project, parentId: parent.id, noteId: parent.noteId};
  return {...state, tasks: syncMeetingParents([task, ...state.tasks])};
}
export function deleteProject(state: WorkState, name: string, fallback = 'General'): {ok: true; state: WorkState; moved: string[]} | {ok: false; error: string} {
  if (name === 'General' || name === fallback) return {ok: false, error: 'The General project cannot be deleted.'};
  if (!state.projects.includes(name)) return {ok: false, error: 'That project is not in this workspace.'};
  const moved = state.tasks.filter(t => t.project === name).map(t => t.id);
  return {ok: true, moved, state: {...state, projects: state.projects.filter(p => p !== name), tasks: state.tasks.map(t => t.project === name ? {...t, project: fallback} : t)}};
}
export function restoreProject(state: WorkState, name: string, taskIds: string[]): WorkState {
  if (!name || name === 'General') return state;
  const ids = new Set(taskIds);
  return {...state, projects: state.projects.includes(name) ? state.projects : [...state.projects, name], tasks: state.tasks.map(t => ids.has(t.id) ? {...t, project: name} : t)};
}
export function captureMeeting(text: string, options: {title: string; project: string; priority: Priority; dueAt: string; remindAt: string; noteId: string | null}, id: () => string): WorkTask[] {
  const parent: WorkTask = {...emptyTask(options.title.trim() || 'Untitled meeting', id()), kind: 'meeting', project: options.project, noteId: options.noteId, dueAt: '', remindAt: '', repeat: '', minutes: 25};
  const children = captureTasks(text, {project: options.project, priority: options.priority, dueAt: options.dueAt, remindAt: options.remindAt, noteId: options.noteId}, id).map(t => ({...t, parentId: parent.id, kind: 'task' as const}));
  return syncMeetingParents([parent, ...children]);
}
export function withNoteActions(tasks: WorkTask[], note: WorkNote, actions: WorkTask[], id: () => string): WorkTask[] {
  const existing = meetingParentForNote(tasks, note.id);
  const parent = existing || {...emptyTask(note.title.trim() || 'Untitled meeting', id()), kind: 'meeting' as const, noteId: note.id, project: actions[0]?.project || 'General', sample: note.sample};
  const children = actions.map(t => ({...t, parentId: parent.id, noteId: note.id, kind: 'task' as const}));
  return syncMeetingParents([...(existing ? [] : [parent]), ...children, ...tasks]);
}
export function meetingTaskId(noteId: string): string {
  const hex = `${noteId.replace(/-/g, '').toLowerCase()}meetingbundle`.replace(/[^0-9a-f]/g, '0').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function bundleNoteTasks(tasks: WorkTask[], notes: WorkNote[], id: (noteId: string) => string = meetingTaskId): WorkTask[] {
  let next = tasks.slice();
  for (const note of notes) {
    const parentId = id(note.id);
    const meetings = next.filter(t => isMeetingTask(t) && t.noteId === note.id && !t.parentId);
    if (meetings.length > 1) {
      const keep = meetings.find(t => t.id === parentId) || meetings[0];
      const extraIds = new Set(meetings.filter(t => t.id !== keep.id).map(t => t.id));
      next = next.map(t => extraIds.has(t.id) || extraIds.has(t.parentId || '') ? {...t, kind: 'task' as const, parentId: keep.id, noteId: note.id} : t);
    }
    if (!meetingParentForNote(next, note.id)) {
      const occupant = next.find(t => t.id === parentId);
      if (occupant) next = next.map(t => t.id === parentId ? {...t, kind: 'meeting' as const, parentId: null, noteId: note.id} : t);
    }
    let parent = meetingParentForNote(next, note.id);
    const orphans = next.filter(t => t.noteId === note.id && !isBundleTask(t) && !t.parentId);
    if (!orphans.length) continue;
    if (!parent) {
      const named = orphans.find(t => t.title.trim() === (note.title.trim() || 'Untitled meeting'));
      if (named && orphans.length > 1) {
        next = next.map(t => t.id === named.id ? {...t, kind: 'meeting' as const, parentId: null} : t);
        parent = next.find(t => t.id === named.id);
      }
    }
    if (parent) {
      const pid = parent.id;
      next = next.map(t => t.id !== pid && orphans.some(o => o.id === t.id) ? {...t, parentId: pid} : t);
      continue;
    }
    if (next.some(t => t.id === parentId)) continue;
    const created: WorkTask = {...emptyTask(note.title.trim() || 'Untitled meeting', parentId), kind: 'meeting', noteId: note.id, project: orphans[0].project, sample: note.sample, createdAt: note.createdAt};
    const orphanIds = new Set(orphans.map(o => o.id));
    next = [created, ...next.map(t => orphanIds.has(t.id) ? {...t, parentId} : t)];
  }
  return syncMeetingParents(next);
}
export function normalizeWorkState(state: WorkState, id?: (noteId: string) => string): WorkState {
  const ids = new Set(state.tasks.map(t => t.id));
  let tasks: WorkTask[] = state.tasks.map(t => ({...t, parentId: t.parentId && ids.has(t.parentId) ? t.parentId : null, kind: asTaskKind(t.kind)}));
  const referenced = new Set(tasks.map(t => t.parentId).filter((value): value is string => !!value));
  tasks = tasks.map(t => {
    if (!referenced.has(t.id)) return t;
    return {...t, kind: asTaskKind(t.kind) === 'group' ? 'group' as const : 'meeting' as const, parentId: null};
  });
  if (id) tasks = bundleNoteTasks(tasks, state.notes, id);
  return {...state, tasks: syncMeetingParents(tasks)};
}
export function taskSearchText(task: WorkTask): string {
  return `${task.title} ${task.body} ${task.project} ${task.steps.map(s => s.title).join(' ')}`;
}
export function matchesSearch(task: WorkTask, tasks: WorkTask[], search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  if (taskSearchText(task).toLowerCase().includes(query)) return true;
  return isBundleTask(task) && childTasks(tasks, task.id).some(c => taskSearchText(c).toLowerCase().includes(query));
}
export function bundleProgressLabel(tasks: WorkTask[], parentId: string, empty = 'No action items'): string {
  const {done, total} = meetingProgress(tasks, parentId);
  if (!total) return empty;
  return `${done} of ${total} completed`;
}
export function meetingProgressLabel(tasks: WorkTask[], parentId: string): string {
  return bundleProgressLabel(tasks, parentId, 'No action items');
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
  const kind=(v:unknown)=>v===undefined||v==='task'||v==='meeting'||v==='group';
  const parentRef=(v:unknown)=>v===undefined||v===null||typeof v==='string';
  if(w.version!==2||typeof w.name!=='string'||!Array.isArray(w.projects)||!w.projects.every(nonempty)||!w.projects.includes('General')||!unique(w.projects)||!Array.isArray(w.tasks)||!Array.isArray(w.notes)||!Array.isArray(w.alerts))return false;
  if(!w.notes.every(n=>n&&nonempty(n.id)&&typeof n.title==='string'&&typeof n.body==='string'&&nonempty(n.createdAt)&&date(n.createdAt)&&(n.datedAt===undefined||dayKey(n.datedAt))&&sample(n.sample))||!unique(w.notes.map(n=>n.id)))return false;
  if(!w.tasks.every(t=>t&&nonempty(t.id)&&typeof t.title==='string'&&typeof t.body==='string'&&w.projects.includes(t.project)&&['High','Medium','Low'].includes(t.priority)&&typeof t.done==='boolean'&&date(t.dueAt)&&date(t.remindAt)&&date(t.notifiedAt)&&nonempty(t.createdAt)&&date(t.createdAt)&&date(t.completedAt)&&(t.noteId===null||w.notes.some(n=>n.id===t.noteId))&&typeof t.minutes==='number'&&Number.isFinite(t.minutes)&&t.minutes>=0&&t.minutes<=600&&sample(t.sample)&&(t.today===undefined||dayKey(t.today))&&repeat(t.repeat)&&(t.seriesId===undefined||typeof t.seriesId==='string')&&kind(t.kind)&&parentRef(t.parentId)&&Array.isArray(t.steps)&&t.steps.every(s=>s&&nonempty(s.id)&&typeof s.title==='string'&&typeof s.done==='boolean'&&(s.parentId===null||typeof s.parentId==='string'))))return false;
  const tasksById=new Map(w.tasks.map(t=>[t.id,t]));
  for(const t of w.tasks){
    const byId=new Map(t.steps.map(s=>[s.id,s]));
    if(byId.size!==t.steps.length)return false;
    for(const s of t.steps){const seen=new Set([s.id]);let p=s.parentId;while(p!==null){if(seen.has(p)||!byId.has(p)||seen.size>40)return false;seen.add(p);p=byId.get(p)!.parentId;}}
    const pid=t.parentId??null;
    if(isBundleTask(t)&&pid)return false;
    if(pid){const parent=tasksById.get(pid);if(!parent||!isBundleTask(parent)||parent.parentId)return false;}
  }
  return unique(w.tasks.map(t=>t.id))&&w.alerts.every(a=>a&&nonempty(a.id)&&(a.taskId===null||typeof a.taskId==='string')&&typeof a.title==='string'&&nonempty(a.at)&&date(a.at)&&typeof a.read==='boolean')&&unique(w.alerts.map(a=>a.id))&&(w.timer===null||(!!w.timer&&w.tasks.some(t=>t.id===w.timer!.taskId&&!t.done&&!isBundleTask(t))&&typeof w.timer.remaining==='number'&&Number.isFinite(w.timer.remaining)&&w.timer.remaining>=0&&w.timer.remaining<=36000&&(w.timer.endsAt===null||(typeof w.timer.endsAt==='number'&&Number.isFinite(w.timer.endsAt)&&w.timer.endsAt>0))));
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

export function matchingNotes(notes: WorkNote[], search: string): WorkNote[] {
  const query = search.trim().toLowerCase();
  return notes.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export function isTodayTask(task: WorkTask, day: string): boolean { return !task.done && task.today === day && !isBundleTask(task); }
export function isTodayEntry(task: WorkTask, day: string): boolean { return task.today === day && !isBundleTask(task); }

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
  return sortCalendarTasks(tasks.filter(t => !isBundleTask(t) && calendarDay(t.dueAt) === day && (!hideCompleted || !t.done)));
}
export function overdueOnCalendar(tasks: WorkTask[], now: number): WorkTask[] {
  return tasks.filter(t => !isBundleTask(t) && !t.done && !!t.dueAt && new Date(t.dueAt).getTime() < now).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
export function unscheduledCount(tasks: WorkTask[]): number {
  return unscheduledTasks(tasks).length;
}
export function unscheduledTasks(tasks: WorkTask[]): WorkTask[] {
  return tasks.filter(t => !isBundleTask(t) && !t.parentId && !t.done && !t.dueAt);
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
  if (!dueAt) return {dueAt: '', remindAt: '', notifiedAt: ''};
  const remindAt = shiftRemindAt(task.remindAt, task.dueAt, dueAt);
  return remindAt === task.remindAt ? {dueAt} : {dueAt, remindAt, notifiedAt: ''};
}
export function remindAtFromDue(dueAt: string, minutesBefore: number): string {
  if (!dueAt) return '';
  const date = new Date(dueAt);
  if (!Number.isFinite(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - minutesBefore);
  return toLocalDateTime(date);
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
    parentId: task.parentId ?? null,
    kind: 'task',
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
