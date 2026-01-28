'use client';

import { useState } from 'react';
import { db } from '@/lib/instantdb';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [authState, setAuthState] = useState<'email' | 'code'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (authState === 'email') {
        if (!email.trim()) {
          setError('Please enter your email address');
          setIsLoading(false);
          return;
        }
        await db.auth.sendMagicCode({ email });
        setPendingEmail(email);
        setAuthState('code');
        setError('Check your email for the magic code');
      } else {
        if (!code.trim()) {
          setError('Please enter the magic code');
          setIsLoading(false);
          return;
        }
        await db.auth.signInWithMagicCode({ 
          email: pendingEmail, 
          code 
        });
        // If successful, the user will be signed in automatically
        // Errors are caught by the try-catch block below
      }
    } catch (err: any) {
      // InstantDB errors may have err.body?.message or err.message
      const errorMessage = err.body?.message || err.message || 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Welcome to Todo App</h2>
        <p>Sign in to access your todos across all devices</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={authState === 'code'}
            />
          </div>
          {authState === 'code' && (
            <div className="form-group">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code from email"
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
              <p className="auth-hint">Check your email for the magic code</p>
            </div>
          )}
          <button 
            type="submit" 
            className="modal-btn primary"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : authState === 'email' ? 'Send Magic Code' : 'Sign In'}
          </button>
        </form>
        {error && (
          <div className={`auth-error ${error.includes('Check your email') ? 'success' : 'error'}`}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
