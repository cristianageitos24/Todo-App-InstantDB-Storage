'use client';

import { useState, useEffect } from 'react';
import { db, id, clearSessionTimestamp } from '@/lib/instantdb';

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const user = db.useUser();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Query user profile
  const { data } = db.useQuery({
    userProfiles: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  const profile = data?.userProfiles?.[0];

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    } else {
      const defaultName = user.email?.split('@')[0] || 'My';
      setDisplayName(`${defaultName}'s Todo List`);
    }
  }, [profile, user.email]);

  const handleBlur = () => {
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

  return (
    <div className="user-profile">
      <div className="profile-controls">
        <input
          type="text"
          className="display-name-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={handleBlur}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          placeholder="Your Name's Todo List"
          maxLength={50}
        />
        <button 
          className="sign-out-btn" 
          onClick={handleSignOut}
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
