'use client';

import { useState, useEffect } from 'react';
import { db, id, clearSessionTimestamp } from '@/lib/instantdb';

const ACCENT_PRESETS = [
  { name: 'Teal', hex: '#00FFC4' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Cyan', hex: '#06B6D4' },
] as const;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function applyAccentColor(hex: string | null) {
  const root = document.documentElement;
  if (hex) {
    root.style.setProperty('--accent-color', hex);
  } else {
    root.style.removeProperty('--accent-color');
  }
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const user = db.useUser();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [accentColor, setAccentColor] = useState<string | null>(null);

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

  // Load and apply accent color from profile
  useEffect(() => {
    const saved = profile?.accentColor ?? null;
    setAccentColor(saved);
    applyAccentColor(saved);
  }, [profile?.accentColor]);

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

  const saveAccentColor = (hex: string | null) => {
    setAccentColor(hex);
    applyAccentColor(hex);
    const value = hex || undefined;
    if (profile) {
      db.transact(
        db.tx.userProfiles[profile.id].update({ accentColor: value })
      );
    } else {
      const profileId = id();
      const defaultName = user.email?.split('@')[0] || 'My';
      db.transact(
        db.tx.userProfiles[profileId].update({
          displayName: `${defaultName}'s Todo List`,
          userId: user.id,
          ...(value !== undefined && { accentColor: value }),
        })
      );
    }
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

          <div className="form-group">
            <label>Accent color:</label>
            <div className="accent-color-controls">
              <div className="accent-presets">
                {ACCENT_PRESETS.map(({ name, hex }) => (
                  <button
                    key={hex}
                    type="button"
                    className={`accent-preset ${(accentColor === hex || (accentColor === null && hex === '#00FFC4')) ? 'selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => saveAccentColor(hex)}
                    title={name}
                    aria-label={`Accent color ${name}`}
                  />
                ))}
              </div>
              <div className="accent-custom-row">
                <input
                  type="color"
                  className="accent-color-input"
                  value={accentColor && ACCENT_PRESETS.every(p => p.hex !== accentColor) ? accentColor : '#00FFC4'}
                  onChange={(e) => saveAccentColor(e.target.value)}
                  aria-label="Custom accent color"
                />
                <span style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>Custom</span>
              </div>
              <button
                type="button"
                className="modal-btn secondary"
                style={{ marginTop: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                onClick={() => saveAccentColor(null)}
              >
                Default (use theme teal)
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
