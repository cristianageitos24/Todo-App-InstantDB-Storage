'use client';

import { useEffect } from 'react';
import { db, isAppIdConfigured, isSessionValid, storeSessionTimestamp } from '@/lib/instantdb';
import AuthForm from '@/components/AuthForm';
import TodoApp from '@/components/TodoApp';
import ConfigError from '@/components/ConfigError';

export default function Home() {
  // Check if InstantDB App ID is configured
  if (!isAppIdConfigured()) {
    return <ConfigError />;
  }

  // Check and restore session on mount, and listen for auth changes
  useEffect(() => {
    const checkAndUpdateSession = async () => {
      try {
        const auth = await db.getAuth();
        if (auth) {
          // User is authenticated
          if (isSessionValid()) {
            // Session is still valid, ensure timestamp is stored
            storeSessionTimestamp();
          } else {
            // Session expired (older than 30 days), but user is still authenticated
            // This means InstantDB's session is still valid, so update our timestamp
            storeSessionTimestamp();
          }
        }
      } catch (error) {
        // User is not authenticated, which is fine
        // InstantDB throws an error when getAuth() is called without auth
      }
    };

    // Check session on mount
    checkAndUpdateSession();

    // Set up an interval to periodically check and update session
    // This ensures the session timestamp stays current while user is active
    const interval = setInterval(() => {
      checkAndUpdateSession();
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <db.SignedOut>
        <AuthForm />
      </db.SignedOut>
      <db.SignedIn>
        <TodoApp />
      </db.SignedIn>
    </>
  );
}
