// shared/user/components/UserDisplay.tsx
'use client';
import React from 'react';
import { useUser } from '../UserContext';

const formatDate = (iso?: string) => {
  if (!iso) return '';
  // Keep it simple; WP users are often EU — display local date
  const d = new Date(iso);
  return d.toLocaleString();
};

const UserDisplay: React.FC = () => {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="mb-3">
      <span>
        Welcome, <strong>{user.first_name} {user.last_name}</strong>
      </span>
      {user.is_demo ? (
        <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 6, background: '#ffeaa7' }}>
          DEMO until {formatDate(user.demo_expires_at)}
        </span>
      ) : null}
    </div>
  );
};

export default UserDisplay;
