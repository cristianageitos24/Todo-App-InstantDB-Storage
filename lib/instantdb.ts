import { init, id as generateId } from "@instantdb/react";
import schema from "../Instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || '__YOUR_APP_ID__';

if (APP_ID === '__YOUR_APP_ID__') {
  console.warn('Please set NEXT_PUBLIC_INSTANTDB_APP_ID in .env.local');
}

/**
 * Check if the InstantDB App ID is properly configured
 * @returns true if App ID is configured, false otherwise
 */
export function isAppIdConfigured(): boolean {
  const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID;
  return appId !== undefined && appId !== null && appId !== '' && appId !== '__YOUR_APP_ID__';
}

// Initialize InstantDB with session persistence
export const db = init({ 
  appId: APP_ID, 
  schema,
  // InstantDB automatically persists sessions in localStorage
  // Sessions are stored with keys prefixed with the app ID
});

// Session persistence helper - tracks when user signed in
const SESSION_STORAGE_KEY = 'instantdb_session_timestamp';
const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Store session timestamp when user signs in
 */
export function storeSessionTimestamp(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());
  }
}

/**
 * Check if session is still valid (within 30 days)
 * @returns true if session is valid, false otherwise
 */
export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const timestampStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!timestampStr) return false;
  
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  
  const now = Date.now();
  const elapsed = now - timestamp;
  
  return elapsed < SESSION_DURATION_MS;
}

/**
 * Clear session timestamp (called on sign out)
 */
export function clearSessionTimestamp(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export const id = generateId;
