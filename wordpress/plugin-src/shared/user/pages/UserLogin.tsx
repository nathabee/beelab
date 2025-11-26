// shared/user/pages/UserLogin.tsx
'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useLoginHandler,
  type BootstrapFn,
  type LangCode,
  fetchDemoStatus,
} from '../useLogin';
import { LoginOrDemoCard } from '../components';
import { getRandomDisplayName } from '../nameGen';
import { useUser } from '../UserContext';

// Plugin provides this hook to get bootstrap and/or apis.
export type UsePluginBootstrap = () => { fetchBootstrapData: BootstrapFn };
export type UsePluginApis = () => { apiUser: AxiosInstance };

export type UserLoginProps = {
  plugin?: string;
  initialDemoRoles?: string[];
  usePluginBootstrap?: UsePluginBootstrap;
  usePluginApis?: UsePluginApis; // plugin-specific apis hook (must return apiUser)
};

type DemoStatus =
  | null
  | {
      has_active_demo: boolean;
      username?: string;
      first_name?: string;
      last_name?: string;
      demo_expires_at?: string;
    };

const UserLogin: React.FC<UserLoginProps> = ({
  initialDemoRoles = ['roleundefined'],
  usePluginBootstrap,
  usePluginApis,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modeFromUrl = searchParams.get('mode') === 'demo' ? 'demo' : 'login';
  const isDemoMode = modeFromUrl === 'demo';

  const { isLoggedIn } = useUser();

  const pluginBootstrap = usePluginBootstrap ? usePluginBootstrap() : null;
  const bootstrapFn: BootstrapFn | undefined = pluginBootstrap?.fetchBootstrapData;

  const apis = usePluginApis ? usePluginApis() : null;
  const apiUser = apis?.apiUser;

  const { handleLogin, handleDemoStart, errorMessage } = useLoginHandler({
    apiUser: apiUser!, // required
    bootstrap: bootstrapFn,
  });

  const [demoStatus, setDemoStatus] = useState<DemoStatus>(null);
  const [checkingDemo, setCheckingDemo] = useState(false);

  const detectLang = (): LangCode => {
    const raw = (
      document.documentElement.lang ||
      navigator.language ||
      'en'
    ).toLowerCase();
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('de')) return 'de';
    if (raw.startsWith('bz')) return 'bz';
    return 'en';
  };

  // 0) If already logged in, never show this page: redirect to dashboard.
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  // 1) In demo mode, ask backend if we have an active demo (cookie-based).
  useEffect(() => {
    if (!isDemoMode) return;
    if (!apiUser) return;

    let cancelled = false;
    setCheckingDemo(true);

    const run = async () => {
      try {
        const st = await fetchDemoStatus(apiUser);
        if (!cancelled) {
          setDemoStatus(st);
        }
      } catch (err) {
        console.warn('[UserLogin] demo_status failed, treating as no active demo', err);
        if (!cancelled) {
          setDemoStatus({ has_active_demo: false });
        }
      } finally {
        if (!cancelled) {
          setCheckingDemo(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, apiUser]);

  // 2) If backend says "has_active_demo", auto-start/resume demo once.
  useEffect(() => {
    if (!isDemoMode) return;
    if (!apiUser) return;
    if (checkingDemo) return;
    if (!demoStatus) return;
    if (!demoStatus.has_active_demo) return;

    let cancelled = false;

    const run = async () => {
      const ok = await handleDemoStart(
        () => {
          if (!cancelled) {
            navigate('/dashboard');
          }
        },
        {
          // no preferredName: backend will reuse demo based on cookie
          roles: initialDemoRoles,
          lang: detectLang(),
        },
      );

      if (!ok && !cancelled) {
        console.warn(
          '[UserLogin] auto demo start/resume failed, falling back to demo form',
        );
        setDemoStatus({ has_active_demo: false });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, apiUser, checkingDemo, demoStatus, handleDemoStart, navigate, initialDemoRoles]);

  const hasActiveDemo = !!demoStatus?.has_active_demo;

  const isDemoLoading =
    isDemoMode &&
    (checkingDemo || (demoStatus !== null && hasActiveDemo));

  const showForm =
    !isDemoMode ||
    (isDemoMode &&
      !checkingDemo &&
      (demoStatus === null || demoStatus.has_active_demo === false));

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              {isDemoLoading && (
                <div className="text-center mb-4">
                  <div className="spinner-border" role="status" aria-hidden="true" />
                  <p className="mt-3">
                    {checkingDemo ? 'Checking demo status…' : 'Starting demo…'}
                  </p>
                </div>
              )}

              {showForm && (
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
                    const roles =
                      opts.roles && opts.roles.length ? opts.roles : initialDemoRoles;

                    await handleDemoStart(
                      () => navigate('/dashboard'),
                      {
                        ...opts,
                        roles,
                      },
                    );
                  }}
                />
              )}

              <hr className="my-4" />
              <div className="text-center">
                {modeFromUrl === 'demo' ? (
                  <>
                    Prefer to sign in?{' '}
                    <Link to="/login" className="link-primary">
                      Go to login
                    </Link>
                  </>
                ) : (
                  <>
                    Just exploring?{' '}
                    <Link to="/login?mode=demo" className="link-warning">
                      Try the demo
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
