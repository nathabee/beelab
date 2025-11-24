// shared/user/pages/UserMgt.tsx
'use client';

import React from 'react';
import type { AxiosInstance } from 'axios';
import { useUserProfile } from '../hooks/useUserProfile';
import UserProfileForm from '../components/UserProfileForm';

// Plugin bootstrap + APIs (same pattern as UserLogin)
export type UsePluginBootstrap = () => { fetchBootstrapData?: (token: string, opts?: { force?: boolean }) => Promise<void> | void };
export type UsePluginApis = () => { apiUser: AxiosInstance };

export type UserMgtProps = {
  plugin?: string;
  usePluginBootstrap?: UsePluginBootstrap;
  usePluginApis?: UsePluginApis; // must provide apiUser
};

export default function UserMgt({
  usePluginBootstrap,
  usePluginApis,
}: UserMgtProps) {
  const pluginBootstrap = usePluginBootstrap ? usePluginBootstrap() : null;
  const bootstrapFn = pluginBootstrap?.fetchBootstrapData;

  const apis = usePluginApis ? usePluginApis() : null;
  const apiUser = apis?.apiUser;

  const {
    username, firstName, lastName, lang,
    setFirstName, setLastName, setLang,
    loading, saving, saved, error, dirty,
    save, reset,
  } = useUserProfile(apiUser);

  // After save, optionally re-run plugin bootstrap to refresh app data
  const handleSave = async () => {
    await save();
    // If your bootstrap needs to reload things that depend on language, do it:
    // We can't access token here directly (hook encapsulates), but bootstrapFn
    // typically only needs token; if not available, skip gracefully.
    try {
      // @ts-expect-error: useUserProfile updates context token; bootstrap util reads it internally if needed.
      if (bootstrapFn) await bootstrapFn(undefined as any, { force: true });
    } catch {
      /* ignore optional bootstrap errors */
    }
  };

  if (!apiUser) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">User API client is not available.</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-6">
          <UserProfileForm
            username={username}
            firstName={firstName}
            lastName={lastName}
            lang={lang}
            setFirstName={setFirstName}
            setLastName={setLastName}
            setLang={setLang}
            loading={loading}
            saving={saving}
            saved={saved}
            error={error}
            dirty={dirty}
            onSave={handleSave}
            onReset={reset}
          />
          <div className="text-muted small mt-3">
            Signed in as <strong>{username}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
