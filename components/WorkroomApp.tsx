'use client';
import {db} from '@/lib/instantdb';
import Workroom from './Workroom';

export default function WorkroomApp(){
  const {user,isLoading,error}=db.useAuth();
  if(isLoading)return <div className="wr-loading">Opening your workspace…</div>;
  if(error)return <div className="wr-loading"><p>Could not check your account. Reload to try again.</p><button onClick={()=>window.location.reload()}>Reload</button></div>;
  return <Workroom key={user?.id||'device'} userId={user?.id||null} email={user?.email||undefined}/>;
}
