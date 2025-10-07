// shared/user/pages/UserLogin.tsx
'use client';
import React from 'react';
import type { AxiosInstance } from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoginHandler, type BootstrapFn, type LangCode } from '../useLogin';
import { LoginOrDemoCard } from '../components';
import { getRandomDisplayName } from '../nameGen';

// Plugin provides this hook to get bootstrap and/or apis.
export type UsePluginBootstrap = () => { fetchBootstrapData: BootstrapFn };
export type UsePluginApis = () => { apiUser: AxiosInstance };

export type UserLoginProps = {
  plugin?: string;
  initialDemoRoles?: string[];
  usePluginBootstrap?: UsePluginBootstrap; // plugin-specific bootstrap hook
  usePluginApis?: UsePluginApis;          // plugin-specific apis hook (must return apiUser)
};

export default function UserLogin({
  initialDemoRoles = ['roleundefined'],
  usePluginBootstrap,
  usePluginApis,
}: UserLoginProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode') === 'demo' ? 'demo' : 'login';

  const pluginBootstrap = usePluginBootstrap ? usePluginBootstrap() : null;
  const bootstrapFn: BootstrapFn | undefined = pluginBootstrap?.fetchBootstrapData;

  const apis = usePluginApis ? usePluginApis() : null;
  const apiUser = apis?.apiUser;

  const { handleLogin, handleDemoStart, errorMessage } = useLoginHandler({
    apiUser: apiUser!,                // required
    bootstrap: bootstrapFn,
  });

  const detectLang = (): LangCode => {
    const raw = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('de')) return 'de';
    if (raw.startsWith('bz')) return 'bz';
    return 'en';
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <LoginOrDemoCard
                mode={modeFromUrl}
                errorMessage={errorMessage}
                detectLang={detectLang}
                initialRolesForDemo={initialDemoRoles}
                getRandomDisplayName={getRandomDisplayName}
                onSubmitLogin={async (username, password) => {
                  await handleLogin(username, password, () => navigate('/dashboard'));
                }}
                onStartDemo={async (opts) => {
                  const roles = opts.roles && opts.roles.length ? opts.roles : initialDemoRoles;
                  await handleDemoStart(() => navigate('/dashboard'), { ...opts, roles });
                }}
              />

              <hr className="my-4" />
              <div className="text-center">
                {modeFromUrl === 'demo' ? (
                  <>
                    Prefer to sign in? <Link to="/login" className="link-primary">Go to login</Link>
                  </>
                ) : (
                  <>
                    Just exploring? <Link to="/login?mode=demo" className="link-warning">Try the demo</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
