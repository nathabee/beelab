'use client';
import React from 'react';

export type Teacher = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_demo_user?: boolean;     // <-- align with backend property
  demo_expires_at?: string;   // ISO string if you expose it
};

type Props = { user: Teacher };

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(); // local format
  } catch {
    return '';
  }
};

const TeacherDisplay: React.FC<Props> = ({ user }) => {
  if (!user) return null;

  return (
    <div className="mb-1">
      Teacher:&nbsp;
      <strong>{user.first_name} {user.last_name}</strong>
      {user.username ? <span className="text-muted"> (@{user.username})</span> : null}
      {user.is_demo_user && (
        <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 6, background: '#ffeaa7' }}>
          DEMO{user.demo_expires_at ? ` until ${formatDate(user.demo_expires_at)}` : ''}
        </span>
      )}
    </div>
  );
};

export default TeacherDisplay;
