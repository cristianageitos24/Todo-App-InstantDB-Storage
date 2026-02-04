'use client';

import { useState, useEffect } from 'react';
import { db, id, clearSessionTimestamp } from '@/lib/instantdb';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const user = db.useUser();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Query user profile
  const { data } = db.useQuery({
    userProfiles: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  const profile = data?.userProfiles?.[0];

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('dark');
    }
  }, []);

  // Load display name
  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    } else {
      const defaultName = user.email?.split('@')[0] || 'My';
      setDisplayName(`${defaultName}'s Todo List`);
    }
  }, [profile, user.email]);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleDisplayNameBlur = () => {
    setIsEditing(false);
    const newName = displayName.trim();
    if (!newName) {
      const defaultName = user.email?.split('@')[0] || 'My';
      setDisplayName(`${defaultName}'s Todo List`);
      return;
    }

    if (profile) {
      db.transact(
        db.tx.userProfiles[profile.id].update({
          displayName: newName
        })
      );
    } else {
      const profileId = id();
      db.transact(
        db.tx.userProfiles[profileId].update({
          displayName: newName,
          userId: user.id
        })
      );
    }
  };

  const handleSignOut = async () => {
    await db.auth.signOut();
    clearSessionTimestamp();
  };

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button 
            className="modal-btn secondary" 
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Close
          </button>
        </div>

        <div className="settings-section">
          <div className="form-group">
            <label htmlFor="display-name">Display Name:</label>
            <input
              type="text"
              id="display-name"
              className="display-name-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={handleDisplayNameBlur}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Your Name's Todo List"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="theme-toggle">Theme:</label>
            <div className="theme-toggle-container">
              <span style={{ color: 'var(--text-color)', marginRight: '10px' }}>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
              <button
                type="button"
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={handleThemeToggle}
                aria-label="Toggle theme"
              >
                <span className="theme-toggle-slider"></span>
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid var(--secondary-color)' }}>
            <button 
              className="modal-btn secondary" 
              onClick={handleSignOut}
              style={{ width: '100%' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
