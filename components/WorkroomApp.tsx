'use client';

import {useEffect, useState} from 'react';
import {clearSessionTimestamp, db, hasSessionTimestamp, isSessionValid, storeSessionTimestamp} from '@/lib/instantdb';
import Workroom from './Workroom';
import WorkroomLogin from './WorkroomLogin';

export default function WorkroomApp() {
  const {user, isLoading, error} = db.useAuth();
  const [sessionReady, setSessionReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (isLoading || error) return;
    if (!user) {
      setExpired(false);
      setSessionReady(true);
      return;
    }
    if (!hasSessionTimestamp()) {
      storeSessionTimestamp();
      setExpired(false);
      setSessionReady(true);
      return;
    }
    if (!isSessionValid()) {
      setExpired(true);
      setSessionReady(true);
      void db.auth.signOut().finally(() => {
        clearSessionTimestamp();
      });
      return;
    }
    setExpired(false);
    setSessionReady(true);
  }, [user, isLoading, error]);

  if (isLoading || !sessionReady) return <div className="wr-loading">Opening your workspace…</div>;
  if (error) {
    return (
      <div className="wr-loading">
        <p>Could not check your account. Reload to try again.</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
  if (!user || expired) return <WorkroomLogin />;
  return <Workroom key={user.id} userId={user.id} email={user.email || undefined} />;
}
