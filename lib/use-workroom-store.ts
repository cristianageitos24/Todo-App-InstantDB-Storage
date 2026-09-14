'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {db} from './instantdb';
import {isWorkState,meetingTaskId,migrateDaylight,normalizeWorkState,seedWorkroom,WORK_KEY,WorkState} from './workroom';
import {cloudChanges,CloudRows,decodeCloud,mergeDevice,mergeMutations,Mutation,overlayCloud} from './workroom-sync';

type Outbox={mutations:Mutation[];device:Pick<WorkState,'alerts'|'timer'>};
export function useWorkroomStore(userId:string|null){
  const cloud=db.useQuery(userId?{todos:{$:{where:{userId}}},userProfiles:{$:{where:{userId}}},workroomNotes:{$:{where:{userId}}},workroomPreferences:{$:{where:{userId}}}}:null);
  const connection=db.useConnectionStatus();
  const [data,render]=useState<WorkState|null>(null);
  const current=useRef<WorkState|null>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [revision,bump]=useState(0);
  const [retry,setRetry]=useState(0);
  const [busy,setBusy]=useState(false);
  const outbox=useRef<Outbox>({mutations:[],device:{alerts:[],timer:null}});
  const sentOverlay=useRef<Mutation[]>([]);
  const inFlight=useRef(false);
  const failed=useRef(false);
  const alive=useRef(true);
  const key=userId?`workroom.account.${userId}.v1`:WORK_KEY;
  const newId=meetingTaskId;
  const show=useCallback((next:WorkState)=>{current.current=next;render(next);},[]);
  const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const cleanBox=(box:Outbox):Outbox=>({...box,mutations:box.mutations.filter(m=>validId(m.id))});
  useEffect(()=>{alive.current=true;try{
    const raw=localStorage.getItem(key);
    if(userId){if(raw){const saved=JSON.parse(raw);if(!Array.isArray(saved.mutations)||!saved.device||!Array.isArray(saved.device.alerts))throw Error();outbox.current=cleanBox({...saved,mutations:mergeMutations([],saved.mutations)});if(JSON.stringify(outbox.current)!==JSON.stringify(saved))localStorage.setItem(key,JSON.stringify(outbox.current));}}
    else if(raw){const saved=JSON.parse(raw);if(!isWorkState(saved))throw Error();const next=normalizeWorkState(saved,newId);show(next);if(JSON.stringify(next)!==JSON.stringify(saved))localStorage.setItem(key,JSON.stringify(next));}
    else {const previous=localStorage.getItem('daylight.workspace.v1');show(normalizeWorkState(previous?migrateDaylight(JSON.parse(previous)):seedWorkroom(),newId));}
    setReady(true);
  }catch{setError('Saved data could not be read. Export a backup before making changes.');if(!userId)show(seedWorkroom());}
  return()=>{alive.current=false;};},[key,userId,show]);
  useEffect(()=>{
    if(!userId||!ready||!cloud.data||cloud.error)return;
    try{
      outbox.current=cleanBox(outbox.current);
      const overlay=[...sentOverlay.current,...outbox.current.mutations];
      const decoded=decodeCloud(overlayCloud(cloud.data as CloudRows,overlay),outbox.current.device);
      const bundled=normalizeWorkState(decoded,newId);
      show(bundled);
      const mutations=cloudChanges(decoded,bundled,userId,cloud.data.userProfiles[0]?.id||userId).filter(m=>validId(m.id));
      if(mutations.length){
        const nextBox={mutations:mergeMutations(outbox.current.mutations,mutations),device:{alerts:bundled.alerts,timer:bundled.timer}};
        localStorage.setItem(key,JSON.stringify(nextBox));
        outbox.current=nextBox;
        bump(n=>n+1);
      }
    }
    catch(e){setError((e as Error).message);}
  },[cloud.data,cloud.error,userId,ready,revision,show,key]);

  useEffect(()=>{
    if(!userId||!ready||!cloud.data||cloud.error||connection!=='authenticated'||inFlight.current||failed.current||!outbox.current.mutations.length)return;
    const queued=outbox.current.mutations.filter(m=>validId(m.id));
    if(queued.length!==outbox.current.mutations.length){outbox.current={...outbox.current,mutations:queued};localStorage.setItem(key,JSON.stringify(outbox.current));}
    if(!queued.length)return;
    const updates=queued.filter(m=>!m.remove);
    const batch=(updates.length?updates:queued.filter(m=>m.remove)).slice(0,updates.length?40:1);
    inFlight.current=true;setBusy(true);
    try{
      const transactions=batch.map(m=>m.remove?db.tx[m.entity][m.id].delete():db.tx[m.entity][m.id].update({...m.values!,userId}));
      db.transact(transactions).then(result=>{
        if(!alive.current)return;
        if(result.status!=='synced')throw new Error('Changes are queued. Reconnect and retry to confirm sync.');
        const sent=new Set(batch);
        sentOverlay.current=[...sentOverlay.current,...batch];
        const next={...outbox.current,mutations:outbox.current.mutations.filter(m=>!sent.has(m))};
        localStorage.setItem(key,JSON.stringify(next));outbox.current=next;setError('');
      }).catch(e=>{
        if(!alive.current)return;
        const denied=batch.length===1&&batch[0].remove&&/permission denied/i.test(String(e.message||''));
        if(denied){
          const sent=new Set(batch);
          sentOverlay.current=[...sentOverlay.current,...batch];
          const next={...outbox.current,mutations:outbox.current.mutations.filter(m=>!sent.has(m))};
          localStorage.setItem(key,JSON.stringify(next));outbox.current=next;setError('');
        }else{failed.current=true;setError(`Sync needs attention: ${e.message||'Could not save changes'}. Your edits are kept on this device.`);}
      }).finally(()=>{inFlight.current=false;if(alive.current){setBusy(false);bump(n=>n+1);}});
    }catch(e){inFlight.current=false;setBusy(false);failed.current=true;if(alive.current)setError(`Sync needs attention: ${(e as Error).message||'Could not save changes'}. Your edits are kept on this device.`);}
  },[userId,ready,cloud.data,cloud.error,connection,revision,retry,key]);

  const setData=useCallback((update:WorkState|null|((before:WorkState|null)=>WorkState|null))=>{
    const before=current.current;const next=typeof update==='function'?update(before):update;
    if(!before||!next||!ready)return false;
    try{
      if(userId){
        if(!cloud.data||cloud.error)throw new Error('Wait for your account to finish loading');
        const mutations=cloudChanges(before,next,userId,cloud.data.userProfiles[0]?.id||userId);
        const nextBox={mutations:mergeMutations(outbox.current.mutations,mutations),device:{alerts:next.alerts,timer:next.timer}};
        localStorage.setItem(key,JSON.stringify(nextBox));outbox.current=nextBox;
      }else localStorage.setItem(key,JSON.stringify(next));
      show(next);bump(n=>n+1);return true;
    }catch(e){setError(`Could not save this change: ${(e as Error).message}`);return false;}
  },[userId,ready,cloud.data,cloud.error,key,show]);
  const restoreBackup=(workspace:WorkState)=>{
    try{
      if(!userId){
        const previous=localStorage.getItem(key);
        if(previous)localStorage.setItem(`${key}.before-restore`,previous);
        const next=normalizeWorkState(workspace,meetingTaskId);
        localStorage.setItem(key,JSON.stringify(next));show(next);setReady(true);setError('');return true;
      }
      if(!current.current||!ready||cloud.error||!cloud.data)throw new Error('Wait for your account to finish loading');
      const mapKey=`${key}.import-ids`;const ids=JSON.parse(localStorage.getItem(mapKey)||'{}');
      const merged=normalizeWorkState(mergeDevice(current.current,workspace,ids,()=>crypto.randomUUID()),meetingTaskId);
      localStorage.setItem(mapKey,JSON.stringify(ids));return setData(merged);
    }catch(e){setError((e as Error).message);return false;}
  };
  const importDevice=()=>{
    try{
      const raw=localStorage.getItem(WORK_KEY);if(!raw)throw new Error('There is no device workspace to import');
      const device=JSON.parse(raw);if(!isWorkState(device))throw new Error('The device workspace is not a valid backup');
      restoreBackup(device);
    }catch(e){setError((e as Error).message);}
  };
  return {data,setData,saveError:cloud.error?`Could not load your account: ${cloud.error.message}`:error,
    retry:()=>{failed.current=false;setError('');setRetry(n=>n+1);},importDevice,restoreBackup,
    pending:busy||outbox.current.mutations.length>0,
    status:!userId?(error?'Save needs attention':'Saved on this device'):cloud.error||error?'Sync needs attention':connection!=='authenticated'?'Offline · changes kept on this device':busy||outbox.current.mutations.length?'Syncing…':'Synced to your account'};
}
