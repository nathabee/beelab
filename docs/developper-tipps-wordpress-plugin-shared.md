# developer-wordpress-plugin-shared.md

This note explains how our **shared React error system** (in `wordpress/plugin-src/_shared/error`) works and how **any plugin** living under `wordpress/plugin-src/<plugin>` can use it.

---

## 1) What is `_shared/error`?

`_shared/error` is a small, framework-agnostic **error toolkit** used by our WordPress React plugins. It provides:

* **Global error bus**: a singleton event bus (per page) to publish/subscribe to app errors.
* **Error context**: collects errors, exposes the latest one, and redirects to an error route for “page-level” problems (e.g. 401/403/500).
* **Error boundary**: catches unexpected render errors and forwards them to the bus.
* **UI helpers**:

  * `ErrorBanner`: slim yellow alert shown at the top of the page for non-blocking errors (e.g. 400).
  * `ErrorPage`: a simple full-page error view (you can keep or replace it).
* **Utilities**:

  * `toAppError(error, ctx?)`: normalize `AxiosError`/unknown into a typed `AppError`.
  * `friendlyMessage(error)`: maps status codes to friendly text.
  * Types: `AppError`, etc.

### What problems does it solve?

* Centralized error capture and UX: **emit once, display everywhere**.
* Consistent redirects on hard errors (e.g. 403 → an error page).
* Reusable across multiple plugins (shared folder + webpack alias).

---

## 2) How to use it in a plugin

Assume your plugin lives in `wordpress/plugin-src/pomolobee` and `_shared/error` lives in `wordpress/plugin-src/_shared/error`.

### 2.1. Webpack alias (required)

In your plugin’s `webpack.config.js`:

```js
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
  ...defaultConfig,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve.alias,
      '@bee/common': path.resolve(__dirname, '../_shared/error'),
      // (your existing aliases)
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@mytypes': path.resolve(__dirname, 'src/mytypes'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.png', '.css'],
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },

  // If you ever see transpile errors for the shared folder, add this rule:
  // module: {
  //   ...defaultConfig.module,
  //   rules: [
  //     ...defaultConfig.module.rules,
  //     {
  //       test: /\.[jt]sx?$/,
  //       include: [path.resolve(__dirname, '../_shared/error')],
  //       use: [
  //         {
  //           loader: require.resolve('babel-loader'),
  //           options: {
  //             presets: [require.resolve('@wordpress/babel-preset-default')],
  //           },
  //         },
  //       ],
  //     },
  //   ],
  // },
};
```

Now any file can import from `@bee/common`.

### 2.2. PHP glue (optional but recommended)

You’ll typically **localize** two values to JS:

* `apiUrl` (if you’re already doing it)
* `errorPath` (the route your React app will navigate to on “page-level” errors)

In your plugin’s main PHP:

```php
add_action('enqueue_block_assets', function () {
    $handle = 'pomolobee-pomolobee-app-view'; // The handle registered by block.json's "viewScript"
    $api_url = get_option('pomolobee_api_url', 'http://localhost:9001/api');

    wp_localize_script($handle, 'pomolobeeSettings', [
        'apiUrl'    => $api_url,
        'basename'  => '',               // SPA base ('' or '/pomolobee')
        'errorPath' => '/pomolobee_error'// Where ErrorProvider will navigate on page errors
    ]);
});
```

> You may choose **not** to auto-create a WordPress page for `/pomolobee_error`. Two options:
>
> * **A)** Create a real WP page for that slug and render the same block (safe, clear URL).
> * **B)** Use a route that is internal to your SPA under a page you already have (e.g. blank basename and React Router handles `/pomolobee_error`).
>   If you use **B**, ensure your Router is mounted on a page that can resolve that path.

### 2.3. Add a route for the error page

In your React Router:

```tsx
// src/app/router.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PomoloBeeHome from '@pages/PomoloBeeHome';
import PomoloBeeDashboard from '@pages/PomoloBeeDashboard';
import { ErrorPage } from '@bee/common';

const AppRoutes = () => (
  <Routes>
    <Route path="/pomolobee_home/*" element={<PomoloBeeHome />} />
    <Route path="/pomolobee_dashboard/*" element={<PomoloBeeDashboard />} />
    {/* Shared error route */}
    <Route path="/pomolobee_error" element={<ErrorPage />} />
    {/* default */}
    <Route path="/" element={<PomoloBeeHome />} />
  </Routes>
);

export default AppRoutes;
```

### 2.4. Wrap your app with the provider & boundary

In your root app component:

```tsx
// src/app/App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@app/router';
import { ErrorProvider, ErrorBanner, ErrorBoundary } from '@bee/common';

const App = () => {
  return (
    <BrowserRouter basename={(window as any).pomolobeeSettings?.basename || '/'}>
      <div className="content-container">
        {/* One provider per mount root */}
        <ErrorProvider errorPath={(window as any).pomolobeeSettings?.errorPath || '/pomolobee_error'}>
          <ErrorBanner />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ErrorProvider>
      </div>
    </BrowserRouter>
  );
};

export default App;
```

> ⚠️ **Do not** mount multiple `ErrorProvider`s for the same React tree.
> ✅ You **can** have multiple block instances on the same page: the `errorBus` is a global singleton per page.

### 2.5. Emit errors from hooks/services/components

Use `toAppError` to normalize any thrown/axios error, then `errorBus.emit`:

```ts
// example in a hook making an API call
import axios from 'axios';
import { toAppError, errorBus, type AppError } from '@bee/common';

async function saveSomething(input: any) {
  try {
    await axios.post('/api/save', input);
  } catch (e) {
    const appErr: AppError = toAppError(e, {
      service: 'my-plugin',
      functionName: 'saveSomething',
    });
    // For hard errors, ensure severity is page:
    if (appErr.httpStatus === 401 || appErr.httpStatus === 403) appErr.severity = 'page';
    errorBus.emit(appErr);
    throw appErr; // optional: rethrow to show inline feedback too
  }
}
```

### 2.6. Show inline errors (optional)

`ErrorBanner` already renders the latest **non-page** error:

```tsx
import { ErrorBanner } from '@bee/common';

function Layout() {
  return (
    <div>
      <ErrorBanner />
      {/* ... */}
    </div>
  );
}
```

Want to render your own custom message? Use the context:

```tsx
import { useErrors, friendlyMessage } from '@bee/common';

function MyComponent() {
  const { last } = useErrors();
  return last ? <div>{friendlyMessage(last)}</div> : null;
}
```

---

## 3) API Reference (what you can import from `@bee/common`)

```ts
import {
  ErrorProvider,        // React provider, pass { errorPath?: string }
  ErrorBoundary,        // React class component
  ErrorBanner,          // React component for non-blocking alert
  ErrorPage,            // React component for full-page error
  errorBus,             // { on(fn): () => void; emit(e): void; clear(): void }
  toAppError,           // (e: unknown, ctx?: Partial<AppError>) => AppError
  friendlyMessage,      // (e: AppError) => string
  type AppError,        // normalized error shape
} from '@bee/common';
```

### `AppError` shape

```ts
export type AppError = {
  id: string; // generated by toAppError
  message: string;
  code?: string | number;
  httpStatus?: number;
  severity: 'toast' | 'page';
  request?: { method?: string; url?: string; payload?: any };
  ts: number; // timestamp
  raw?: unknown; // original error
  component?: string;    // optional metadata
  functionName?: string; // optional metadata
  service?: string;      // optional metadata
};
```

---

## 4) Common pitfalls & fixes

* **Double provider / routing errors**
  Make sure there’s **one** `ErrorProvider` per React root and your `BrowserRouter` wraps it.
* **Wrong imports (default vs named)**
  Import like:
  `import { ErrorProvider, ErrorBanner, ErrorBoundary, ErrorPage } from '@bee/common';`
* **Missing `errorBus.ts`**
  The shared folder must contain `errorBus.ts` exactly (case-sensitive).
* **Custom path not found**
  If you pass `errorPath`, ensure your Router has a `<Route>` for it.
* **Multiple block instances**
  It’s fine—`errorBus` is a global singleton. Each instance can listen/emit.

---

## 5) Minimal checklist for a new plugin

1. **Alias** `@bee/common` → `../_shared/error` in `webpack.config.js`.
2. **Localize** `errorPath` via PHP (or hardcode it in your app).
3. Add error route (e.g. `/myplugin_error`) with `<ErrorPage />`.
4. Wrap your app with `<ErrorProvider>` and `<ErrorBoundary>`.
5. Use `toAppError` + `errorBus.emit()` in your API/hooks.
6. Drop `<ErrorBanner />` in your layout to display non-blocking errors.

That’s it—your plugin now gets robust, consistent error handling with minimal boilerplate.
