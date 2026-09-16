'use client';

import {useState} from 'react';
import {db, storeSessionTimestamp} from '@/lib/instantdb';
import {Icon} from './WorkUI';

function authMessage(err: unknown) {
  const body = err as {body?: {message?: string}; message?: string};
  const raw = body.body?.message || body.message || '';
  const lower = raw.toLowerCase();
  if (lower.includes('magic-code') || lower.includes('invalid') || lower.includes('not found')) {
    return 'That code didn’t work. Try again or resend a new one.';
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  return raw || 'Something went wrong. Please try again.';
}

export default function WorkroomLogin() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(address = email) {
    const value = address.trim();
    if (!value) {
      setError('Enter the email you want to use for Workroom.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await db.auth.sendMagicCode({email: value});
      setSentTo(value);
      setEmail(value);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!code.trim()) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await db.auth.signInWithMagicCode({email: sentTo, code: code.trim()});
      storeSessionTimestamp();
    } catch (err) {
      setError(authMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workroom wr-login">
      <aside className="wr-login-editorial">
        <div className="wr-login-editorial-inner">
          <p className="wr-brand">
            <span className="wr-logomark" aria-hidden="true"><span/><span/><span/></span>
            workroom<span className="brand-period">.</span>
          </p>
          <p className="wr-login-kicker">Personal workspace</p>
          <h1>Your work, under control.</h1>
          <p className="wr-login-lede">A quiet place for the tasks, notes, and calendar that actually move the day.</p>
          <ul className="wr-login-points">
            <li>
              <Icon name="check" size={16}/>
              <span>One list for what needs doing</span>
            </li>
            <li>
              <Icon name="note" size={16}/>
              <span>Meeting notes that stay with the work</span>
            </li>
            <li>
              <Icon name="calendar" size={16}/>
              <span>A calendar for what comes next</span>
            </li>
          </ul>
        </div>
      </aside>
      <main className="wr-login-panel">
        <div className="wr-login-card">
          <p className="wr-login-kicker">Sign in</p>
          <h2>{sentTo ? 'Check your email' : 'Welcome back'}</h2>
          <p className="wr-login-copy">
            {sentTo
              ? <>We sent a sign-in code to <strong>{sentTo}</strong>. New here? The same code creates your account.</>
              : 'Enter your email and we’ll send a one-time code. We’ll create an account if you don’t have one yet.'}
          </p>
          <form
            className="wr-login-form"
            onSubmit={e => {
              e.preventDefault();
              void (sentTo ? verify() : send());
            }}
          >
            {sentTo ? (
              <label>
                Sign-in code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  required
                  autoFocus
                  aria-label="Email sign-in code"
                />
              </label>
            ) : (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  required
                  autoFocus
                />
              </label>
            )}
            {error && <p className="wr-error" role="alert">{error}</p>}
            <button className="wr-primary wr-login-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : sentTo ? 'Enter workspace' : 'Email me a code'}
              {!busy && <Icon name="arrow" size={16}/>}
            </button>
            {sentTo && (
              <div className="wr-login-alt">
                <button type="button" className="wr-text" disabled={busy} onClick={() => void send(sentTo)}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="wr-text"
                  disabled={busy}
                  onClick={() => {
                    setSentTo('');
                    setCode('');
                    setError('');
                  }}
                >
                  Use a different email
                </button>
              </div>
            )}
          </form>
          <p className="wr-login-stay">You’ll stay signed in on this device for 30 days.</p>
        </div>
      </main>
    </div>
  );
}
