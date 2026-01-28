'use client';

import { db } from '@/lib/instantdb';
import AuthForm from '@/components/AuthForm';
import TodoApp from '@/components/TodoApp';

export default function Home() {
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
