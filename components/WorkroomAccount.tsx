'use client';

import {useState} from 'react';
import {clearSessionTimestamp, db} from '@/lib/instantdb';

export function WorkroomAccount({
  email,
  pending,
  importDevice,
}: {
  email?: string;
  pending: boolean;
  importDevice: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <section className="settings-section cloud-account">
      <h3>Your account</h3>
      {email && <p>{email}</p>}
      <p>Use this email on your phone and computer to access the same tasks and notes. You’ll stay signed in on this device for 30 days.</p>
      <div className="sync-controls">
        <button
          className="wr-secondary"
          disabled={pending}
          onClick={() => {
            if (window.confirm('Add this browser’s non-example tasks and notes to this account? Existing account work and the device copy will be kept.')) {
              importDevice();
            }
          }}
        >
          Import this device’s work
        </button>
        <button
          className="wr-text"
          disabled={pending || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await db.auth.signOut();
              clearSessionTimestamp();
            } catch {
              setError('Could not sign out. Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
      </div>
      {pending && <p role="status">Waiting for your changes to sync before signing out.</p>}
      {error && <p className="wr-error" role="alert">{error}</p>}
    </section>
  );
}
