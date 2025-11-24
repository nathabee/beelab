'use client';

// src/hooks/useBootstrapData.ts

import { useUser } from '@bee/common';
import { apiUser, apiApp, authHeaders } from '@utils/api';
import { toAppError, errorBus, AppError } from '@bee/common/error';

import { useApp } from '@context/AppContext';

import type { InfoResponse, InfoMe } from '@mytypes/info';
import type { TemplateDefinition } from '@mytypes/template';
import type { SupportedLanguage } from '@mytypes/language';

type BootstrapOpts = {
  force?: boolean;
  /**
   * Optional explicit token override (e.g. passed by UserLogin right after /demo/start).
   */
  tokenOverride?: string;
};

export default function useBootstrapData() {
  const {
    info,
    setInfo,
    setMe,
    templates,
    setTemplates,
    languages,
    setLanguages,
    bootstrapReady,
    setBootstrapReady,
  } = useApp();

  const { token } = useUser();

  /**
   * Bootstrap: loads core data for the plugin:
   *  - /info/        (public)
   *  - /templates/   (protected)
   *  - /languages/   (protected)
   *
   * Can be called as:
   *   fetchBootstrapData();                     // use token from context
   *   fetchBootstrapData({ force: true });      // force refresh with context token
   *   fetchBootstrapData(tokenString);          // use explicit token (e.g. right after demo login)
   *   fetchBootstrapData({ tokenOverride });    // same, but with options
   */
  const fetchBootstrapData = async (
    arg?: BootstrapOpts | string,
  ): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });

    let opts: BootstrapOpts;
    let tokenOverride: string | undefined;

    if (typeof arg === 'string') {
      // Called as fetchBootstrapData(tokenString)
      tokenOverride = arg;
      opts = {};
    } else {
      opts = arg ?? {};
      tokenOverride = opts.tokenOverride;
    }

    const effectiveToken = tokenOverride ?? token;

    console.log(
      '[beefont/bootstrap] fetchBootstrapData @',
      time,
      'opts=',
      opts,
      'tokenOverride=',
      tokenOverride ? '[provided]' : 'none',
    );

    // Short-circuit if we are already ready and not forced.
    if (!opts.force && bootstrapReady && info && templates && languages) {
      console.log('[beefont/bootstrap] already ready, skip');
      return;
    }

    try {
      // 1) /info/ – public: no auth header needed
      if (opts.force || !info) {
        const responseInfo = await apiUser.get<InfoResponse>('/info/');
        setInfo(responseInfo.data);
      }

      // From here on we need a token
      if (!effectiveToken) {
        const appErr: AppError = {
          name: 'AuthError',
          message: 'No auth token available for BeeFont bootstrap.',
          httpStatus: 401,
          severity: 'page',
          service: 'beefont',
          raw: null,
        };
        errorBus.emit(appErr);
        return Promise.reject(appErr);
      }

      const headers = authHeaders(effectiveToken);

      // 2) /templates/
      if (opts.force || !templates) {
        const responseTpl = await apiApp.get<TemplateDefinition[]>('/templates/', {
          headers,
        });
        setTemplates(responseTpl.data);
      }

      // 3) /languages/
      if (opts.force || !languages) {
        const responseLang = await apiApp.get<SupportedLanguage[]>('/languages/', {
          headers,
        });
        setLanguages(responseLang.data);
      }

      setBootstrapReady(true);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        functionName: 'useBootstrapData.fetchBootstrapData',
        service: 'beefont',
      });

      appErr.severity = 'page';
      errorBus.emit(appErr);

      return Promise.reject(appErr);
    }
  };

  /**
   * Protected /me/ fetch – already correctly supports tokenParam.
   */
  const fetchMe = async (tokenParam?: string): Promise<void> => {
    const t = tokenParam ?? token;
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/bootstrap] fetchMe @', time);

    if (!t) {
      console.warn('[beefont/bootstrap] fetchMe: no token, bail');
      setMe(null);
      return;
    }

    const headers = authHeaders(t);

    try {
      const response = await apiUser.get<InfoMe>('/me/', { headers });
      setMe(response.data);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        functionName: 'useBootstrapData.fetchMe',
        service: 'beefont',
      });

      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
        setMe(null);
        return Promise.reject(appErr);
      }

      return Promise.reject(appErr);
    }
  };

  return { fetchBootstrapData, fetchMe };
}
