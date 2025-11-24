# WordPress Plugin Developer Guide: Using the Shared User Library

This guide explains how to integrate the **shared user library** (`@bee/common`) into any WordPress React plugin (e.g., Pomolobee).
It covers setup, provider wiring, API usage, and common UI patterns (login/logout, guards, displaying the user).

---

## 0) What the shared user library provides

Exports (from your `shared/index.ts`):

* **Context + hook**

  * `UserProvider` – React provider that manages token + user state (localStorage-backed, cross-tab sync, expiry guard).
  * `useUser()` – returns `{ token, user, isLoggedIn, login, logout, setToken }`.
  * `useValidToken()` – optional helper to wait for a non-expired token.
* **JWT / storage utils**

  * `isTokenExpired(token)` – checks JWT expiry.
  * `getTokenFromStorage()` – reads current token from storage.
* **UI (optional)**

  * `UserDisplay` – simple component rendering the current user.

> Storage keys used by default: `authToken`, `userInfo`
> The provider also listens to the `storage` event for cross-tab updates and polls token expiry every 30s.

---

## 1) Webpack alias

📌 **File:** `plugin-src/<your-plugin>/webpack.config.js`

```js
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
  ...defaultConfig,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve.alias,
      '@bee/common': path.resolve(__dirname, '../shared'), // top-level shared barrel
      '@context': path.resolve(__dirname, 'src/context'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@mytypes': path.resolve(__dirname, 'src/mytypes'),
    },
  },
};
```

> If your shared barrel sits at `shared/index.ts`, point `@bee/common` there.

---

## 2) Wrap your app with `UserProvider`

📌 **File:** `plugin-src/<your-plugin>/src/<app-entry>/view.tsx`

```tsx
import { createRoot } from '@wordpress/element';
import App from '@app/App';
import { AppProvider } from '@context/AppContext';
import { UserProvider } from '@bee/common'; // from shared index
import './style.css';

const mountPoints = document.querySelectorAll('.wp-block-<your-block>');

mountPoints.forEach((el) => {
  const root = createRoot(el);
  root.render(
    <UserProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </UserProvider>
  );
});
```

> `UserProvider` should wrap your `AppProvider` so any app state can react to auth changes if needed.

---

## 3) API client wiring (axios)

Use the **shared HTTP factory** so errors are normalized and WP nonce is attached. Tag errors with your plugin name.

📌 **File:** `plugin-src/<your-plugin>/src/utils/api.ts`

```ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

// resolve from window settings and envs
const BASE = resolveBaseUrl({
  settingsKey: '<yourPluginSettingsObject>', // e.g. 'pomolobeeSettings'
  settingsProp: 'apiUrl',
  envVars: ['VITE_<PLUGIN>_API_BASE', '<PLUGIN>_API_BASE'],
});

const pluginTag = { plugin: '<your-plugin-name>' };

export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',         // your user API base
  service: 'user',
  nonceKeys: ['beeNonce', '<yourPluginSettingsObject>'],
  meta: pluginTag,           // tag errors for ErrorHistoryPage filtering
});

export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/<your-app-scope>', // e.g. '/pomolobee'
  service: '<your-app-scope>',
  nonceKeys: ['beeNonce', '<yourPluginSettingsObject>'],
  meta: pluginTag,
});

export const authHeaders = _authHeaders;
```

> This keeps user-shared code generic while your plugin decides base paths and plugin tag.

---

## 4) Read and change auth state in UI

### 4.1 Navbar with login/logout (and optional app reset)

📌 **File:** `plugin-src/<your-plugin>/src/app/Header.tsx`

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext'; // if you need reset

export default function Header() {
  const { isLoggedIn, user, logout } = useUser();
  const { reset } = useApp(); // optional

  const handleLogout = () => {
    logout();  // clears token + user + LS + broadcasts storage event
    reset?.(); // optional app state reset
  };

  return (
    <nav>
      <Link to="/">Home</Link>
      {isLoggedIn ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
      {isLoggedIn && <span>Hi, {user?.name || user?.email}</span>}
    </nav>
  );
}
```

### 4.2 Login flow (example)

📌 **File:** `plugin-src/<your-plugin>/src/pages/Login.tsx`

```tsx
import React, { useState } from 'react';
import { useUser } from '@bee/common';
import { apiUser } from '@utils/api';

export default function LoginPage() {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // call your backend
    const { data } = await apiUser.post('/login', { email, password: pwd });
    // assume response contains { token, user }
    login(data.token, data.user);
  }

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Password" />
      <button type="submit">Sign in</button>
    </form>
  );
}
```

> `login(token, user)` sets both in state and persists them to `localStorage`.

---

## 5) Route guards (optional)

### 5.1 Simple “must be logged in” element

📌 **File:** `plugin-src/<your-plugin>/src/app/guards/RequireAuth.tsx`

```tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '@bee/common';

export default function RequireAuth() {
  const { isLoggedIn } = useUser();
  const loc = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}
```

📌 **File:** `plugin-src/<your-plugin>/src/app/router.tsx`

```tsx
import RequireAuth from './guards/RequireAuth';

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<RequireAuth />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  <Route path="/" element={<Home />} />
</Routes>
```

### 5.2 Wait for a non-expired token (optional)

If you use `useValidToken()`:

```tsx
import { useValidToken } from '@bee/common';

function ProtectedData() {
  const token = useValidToken();     // null until a valid token is present
  if (!token) return <div>Loading…</div>;
  // fetch with token...
}
```

---

## 6) Showing the current user (optional UI)

📌 **File:** `plugin-src/<your-plugin>/src/components/UserSummary.tsx`

```tsx
import React from 'react';
import { useUser, UserDisplay } from '@bee/common';

export default function UserSummary() {
  const { user } = useUser();
  return user ? <UserDisplay user={user} /> : <span>Not logged in</span>;
}
```

> If your shared `UserDisplay` expects props differently, adjust accordingly.
> If you re-exported it as a named export (`{ UserDisplay }`), import as shown.

---

## 7) WordPress PHP glue (settings)

If you already localize `apiUrl` and `basename` (like in the error manual), nothing more is required specifically for auth.
Just ensure your backend issues a JWT with `exp` so `isTokenExpired` works as expected.

```php
wp_localize_script($handle, '<yourPluginSettingsObject>', [
  'apiUrl'   => $api_url,
  'basename' => '',
  // optional: anything else your app needs
]);
```

---

## 8) Storage keys, expiry and cross-tab sync

* Keys used by the provider:

  * `authToken` – JWT
  * `userInfo` – serialized user object
* On mount, the provider:

  * loads both keys from `localStorage`
  * clears token if `isTokenExpired(token) === true`
  * polls every 30s to auto-clear when expired
  * listens to `storage` events to keep multiple tabs in sync
* On `logout()`:

  * clears token/user from state and `localStorage`
  * optional: in your UI, also call `AppContext.reset()` to clear domain state

---

## 9) Optional: namespacing storage keys

If multiple plugins share the same page and you want isolated storage keys, you can extend `UserProvider` with a `config` prop like:

```tsx
<UserProvider config={{ storagePrefix: 'pb' }}>
  ...
</UserProvider>
```

…and inside the provider, use `key('authToken')` instead of raw strings.
*(If you haven’t implemented this yet, you can add it later. The library works without it.)*

---

## 10) Common pitfalls & fixes

* **Imported `AuthProvider` instead of `UserProvider`**
  Make sure you import `{ UserProvider }` from `@bee/common`.
* **Using `isAuthenticated` instead of `isLoggedIn`**
  The context exposes `isLoggedIn`; update components accordingly.
* **Calling multiple functions in `onClick` directly**
  Use a handler: `onClick={() => { logout(); reset(); }}` or define `handleLogout`.
* **User not restored on refresh**
  Ensure you didn’t remove the `setUser(JSON.parse(u))` on boot in `UserProvider`.
* **No API base**
  Check your `resolveBaseUrl` configuration and localized `apiUrl`.

---

## 11) Quick checklist

| File                   | Insert this                            | Purpose                            |
| ---------------------- | -------------------------------------- | ---------------------------------- |
| `webpack.config.js`    | alias `@bee/common` → shared           | Resolve shared user library        |
| `src/<entry>/view.tsx` | Wrap with `<UserProvider>`             | Provide auth state to the app      |
| `src/utils/api.ts`     | `createAxiosClient` with `meta.plugin` | App-specific API and error tagging |
| `src/app/App.tsx`      | Use as normal (no change)              | User provider is already higher    |
| `src/app/Header.tsx`   | `useUser()` + `logout()`               | Navbar login/logout                |
| `src/pages/Login.tsx`  | Call backend then `login(token, user)` | Perform login                      |
| `src/app/router.tsx`   | Optional `<RequireAuth/>`              | Guard private routes               |

---

## 12) Minimal example imports

```ts
import {
  UserProvider,
  useUser,
  useValidToken,
  isTokenExpired,
  getTokenFromStorage,
  // UI
  UserDisplay,
} from '@bee/common';
```

---
 