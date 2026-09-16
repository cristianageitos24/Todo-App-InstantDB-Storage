import {DEFAULT_FOCUS_MINUTES, emptyTask, isWorkState, normalizeWorkState, toLocalDateTime, WorkState, WorkTask, WorkNote} from './workroom';

export type Row = {id: string; [key: string]: unknown};
export type CloudRows = {todos?: Row[]; workroomNotes?: Row[]; userProfiles?: Row[]; workroomPreferences?: Row[]};
export type Mutation = {entity: 'todos'|'workroomNotes'|'workroomPreferences'|'userProfiles'; id: string; values?: Record<string, unknown>; remove?: boolean};
export const blankWorkspace = (): WorkState => ({version:2,tasks:[],notes:[],projects:['General'],alerts:[],timer:null,name:''});
const iso = (v: unknown) => v && Number.isFinite(new Date(v as string).getTime()) ? new Date(v as string).toISOString() : '';
const local = (v: unknown) => iso(v) ? toLocalDateTime(new Date(v as string)) : '';
const string = (v: unknown, fallback='') => typeof v==='string'?v:fallback;

export function decodeCloud(rows: CloudRows, device: Pick<WorkState,'alerts'|'timer'>): WorkState {
  const dayKey = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  const notes=(rows.workroomNotes||[]).map(n=>{
    const datedAt = dayKey(n.datedAt) || (iso(n.datedAt) ? iso(n.datedAt).slice(0, 10) : '');
    return {id:n.id,title:string(n.title),body:string(n.body),createdAt:iso(n.createdAt)||new Date(0).toISOString(),...(datedAt?{datedAt}:{})};
  });
  const tasks=(rows.todos||[]).map(row=>{
    const follow=row.followUp as {notes?:string;dateTime?:string}|null;
    const repeat = row.repeat === 'weekly' || row.repeat === 'weekdays' || row.repeat === 'biweekly' || row.repeat === 'monthly' ? row.repeat : '';
    const minutes=typeof row.minutes==='number'&&Number.isFinite(row.minutes)?Math.min(600,Math.max(0,row.minutes)):DEFAULT_FOCUS_MINUTES;
    const steps=Array.isArray(row.steps)?row.steps.flatMap(raw=>{
      const s=raw as {id?:unknown;title?:unknown;done?:unknown;parentId?:unknown};
      const id=string(s?.id);if(!id)return [];
      return [{id,title:string(s?.title),done:s?.done===true,parentId:typeof s?.parentId==='string'?s.parentId:null}];
    }):[];
    return {...emptyTask(string(row.text),row.id), done:row.completed===true,createdAt:iso(row.createdDate)||new Date(0).toISOString(),completedAt:iso(row.completedDate),
      body:string(follow?.notes),dueAt:local(follow?.dateTime),project:string(row.project,'General').trim()||'General',priority:row.priority==='High'||row.priority==='Low'?row.priority:'Medium',
      remindAt:string(row.remindAt),notifiedAt:string(row.notifiedAt),minutes,steps,
      noteId:notes.some(n=>n.id===row.noteId)?row.noteId as string:null,today:dayKey(row.today)||(iso(row.today)?iso(row.today).slice(0,10):''),repeat,seriesId:string(row.seriesId),
      parentId:typeof row.parentId==='string'&&row.parentId?row.parentId:null,kind:row.kind==='meeting'?'meeting':'task'} as WorkTask;
  });
  const prefs=rows.workroomPreferences?.[0];
  const projects=Array.from(new Set(['General',...(Array.isArray(prefs?.projects)?prefs.projects.filter(p=>typeof p==='string'&&p.trim()):[]),...tasks.map(t=>t.project)]));
  const decoded: WorkState={version:2,tasks:tasks.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),notes:notes.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),projects,name:string(rows.userProfiles?.[0]?.displayName),alerts:device.alerts,timer:null};
  const repaired=normalizeWorkState({...decoded,timer:device.timer&&decoded.tasks.some(t=>t.id===device.timer?.taskId&&!t.done&&t.kind!=='meeting')?device.timer:null});
  if(isWorkState(repaired))return repaired;
  const loosened=normalizeWorkState({...decoded,timer:null,tasks:decoded.tasks.map(t=>({...t,steps:Array.isArray(t.steps)?t.steps.filter(s=>s&&typeof s.id==='string'&&typeof s.title==='string'&&typeof s.done==='boolean'):[]}))});
  if(!isWorkState(loosened))throw new Error('Some cloud records could not be read safely. Your data has not been changed.');
  return loosened;
}
function encodeTask(t:WorkTask):Record<string,unknown> {
  return {text:t.title,completed:t.done,createdDate:t.createdAt,completedDate:t.completedAt||null,followUp:{notes:t.body,dateTime:t.dueAt?new Date(t.dueAt).toISOString():null},project:t.project,priority:t.priority,remindAt:t.remindAt,notifiedAt:t.notifiedAt,minutes:t.minutes,steps:t.steps,noteId:t.noteId,today:t.today||'',repeat:t.repeat||'',seriesId:t.seriesId||'',parentId:typeof t.parentId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.parentId)?t.parentId:'',kind:t.kind||'task'};
}
const encodeNote=(n:WorkNote):Record<string,unknown>=>({title:n.title,body:n.body,createdAt:n.createdAt,datedAt:n.datedAt||''});
export function cloudChanges(before:WorkState,after:WorkState,userId:string,profileId:string):Mutation[]{
  const changes:Mutation[]=[];
  function collection<T extends {id:string}>(entity:Mutation['entity'],old:T[],next:T[],encode:(t:T)=>Record<string,unknown>){
    const prior=new Map(old.map(t=>[t.id,t]));
    for(const item of next){const prev=prior.get(item.id);const a=prev?encode(prev):{};const b=encode(item);const values=Object.fromEntries(Object.entries(b).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(a[key])));if(Object.keys(values).length)changes.push({entity,id:item.id,values:{...values,userId}});prior.delete(item.id);}
    for(const id of prior.keys())changes.push({entity,id,remove:true});
  }
  collection('todos',before.tasks,after.tasks,encodeTask);
  collection('workroomNotes',before.notes,after.notes,encodeNote);
  if(JSON.stringify(before.projects)!==JSON.stringify(after.projects))changes.push({entity:'workroomPreferences',id:userId,values:{userId,projects:after.projects}});
  if(before.name!==after.name)changes.push({entity:'userProfiles',id:profileId,values:{userId,displayName:after.name}});
  return changes;
}
export function mergeMutations(existing:Mutation[], extra:Mutation[]):Mutation[]{
  const list:Mutation[]=[];
  for(const m of [...existing,...extra]){
    const i=list.findIndex(x=>x.entity===m.entity&&x.id===m.id);
    if(i<0)list.push({...m,values:m.values?{...m.values}:undefined});
    else if(m.remove||list[i].remove)list[i]=m;
    else list[i]={...list[i],values:{...list[i].values,...m.values}};
  }
  return list;
}
export function overlayCloud(rows:CloudRows,mutations:Mutation[]):CloudRows {
  const result={...rows};
  for(const m of mutations){
    if(typeof m.id!=='string'||m.id.startsWith('meet:'))continue;
    const list=[...(result[m.entity]||[])];const index=list.findIndex(r=>r.id===m.id);if(m.remove){if(index>=0)list.splice(index,1);}else if(index>=0){list[index]={...list[index],...m.values};}else list.push({id:m.id,...m.values});result[m.entity]=list;
  }
  return result;
}
// A stored import ID map makes retries reuse identities without overwriting existing work.
export function mergeDevice(cloud:WorkState,device:WorkState,ids:Record<string,string>,id:()=>string):WorkState {
  const mapped=(kind:string,value:string)=>{const existing=kind==='note'?cloud.notes:cloud.tasks;return existing.some(item=>item.id===value)?value:ids[`${kind}:${value}`]||(ids[`${kind}:${value}`]=id());};
  const notes=device.notes.filter(n=>!n.sample).map(n=>({...n,id:mapped('note',n.id)}));
  const tasks=device.tasks.filter(t=>!t.sample).map(t=>({...t,id:mapped('task',t.id),noteId:t.noteId&&device.notes.some(n=>n.id===t.noteId&&!n.sample)?mapped('note',t.noteId):null,parentId:t.parentId&&device.tasks.some(x=>x.id===t.parentId&&!x.sample)?mapped('task',t.parentId):null,kind:t.kind==='meeting'?'meeting' as const:'task' as const}));
  return {...cloud,notes:[...cloud.notes,...notes.filter(n=>!cloud.notes.some(x=>x.id===n.id))],tasks:[...cloud.tasks,...tasks.filter(t=>!cloud.tasks.some(x=>x.id===t.id))],projects:Array.from(new Set([...cloud.projects,...device.projects])),name:cloud.name||device.name};
}
