# WordPress Plugin Developer Guide: Using the Shared Error Library

This guide explains how to integrate the **shared React error system** (`@bee/common/error`) into any WordPress React plugin (e.g. Pomolobee).
It covers architecture, setup, usage, and expected behaviors.
---

Absolutely—here’s a **Mermaid** flow you can paste right under the manual. It shows both API-originated and manually emitted errors flowing through the system.

```mermaid
flowchart TD
  %% Nodes
  subgraph Plugin_App["Your Plugin (Pomolobee)"]
    AC[Axios Client (apiApp/apiUser)]
    MC[Manual Error (toAppError + errorBus.emit)]
    RP[React Pages / Components]
  end

  subgraph Shared_Lib["@bee/common (shared error lib)"]
    FAC[createAxiosClient (interceptors)]
    TAE[toAppError(error, ctx)]
    EB[errorBus (global singleton)]
    EPV[ErrorProvider (context)]
    EBN[ErrorBanner (toast/inline)]
    EPG[ErrorPage (full-page)]
    EHP[ErrorHistoryPage (history)]
    UEH[useErrorHistory (listener)]
  end

  %% API flow
  RP -->|HTTP request| AC
  AC -->|error| FAC
  FAC -->|normalize| TAE
  TAE -->|AppError| EB

  %% Manual flow
  RP -->|create error| MC
  MC --> EB

  %% Distribution
  EB -->|subscribe| EPV
  EB -->|subscribe| UEH
  UEH --> EHP

  %% Decision in Provider
  EPV -->|severity == "page"| EPG
  EPV -->|severity == "toast" or "inline"| EBN

  %% Notes
  note right of FAC
    Adds default meta (e.g., { plugin: "pomolobee" })
    via createAxiosClient({ meta })
  end

  note right of TAE
    Normalizes Axios/unknown errors:
    - httpStatus, code
    - severity (page/toast/inline)
    - service, functionName
    - meta (e.g., plugin)
  end

  note right of EPV
    Keeps latest error in context.
    Navigates to configured errorPath
    when severity === "page".
  end

  style Plugin_App fill:#f6f8fa,stroke:#c0c0c0,stroke-width:1px
  style Shared_Lib fill:#f6fff8,stroke:#c0c0c0,stroke-width:1px
```

 

---

## 1. What the shared error system is

The shared error library provides:

* **Global error bus**: singleton event emitter for app errors.
* **Error context & provider**: collects errors, exposes the latest one, redirects on “page-level” problems.
* **Error boundary**: catches unexpected render errors and forwards them.
* **UI helpers**:

  * `ErrorBanner`: slim alert for non-blocking errors.
  * `ErrorPage`: full-page error view (blocking).
  * `ErrorHistoryPage`: shows a table of all past errors.
  * `ErrorTestButtons`: buttons to simulate errors (dev only).
* **Utilities**:

  * `toAppError(error, ctx?)`: normalize unknown/Axios errors into `AppError`.
  * `friendlyMessage(error)`: map status codes to user-friendly text.
  * `useErrorHistory`: hook for recorded errors.
* **Types**:

  * `AppError` and helpers.

---

## 2. Setup in a plugin

### 2.1. Webpack alias

In your plugin’s `webpack.config.js`:

```js
alias: {
  '@bee/common': path.resolve(__dirname, '../_shared/error'),
  '@context': path.resolve(__dirname, 'src/context'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  // ...other aliases
}
```

Now import with `import { ErrorProvider, ErrorPage } from '@bee/common';`.

---

### 2.2. Localize settings from PHP

Provide API URL and error route to JS:

```php
add_action('enqueue_block_assets', function () {
    $handle = 'pomolobee-pomolobee-app-view';
    $api_url = get_option('pomolobee_api_url', 'http://localhost:9001/api');

    wp_localize_script($handle, 'pomolobeeSettings', [
        'apiUrl'    => $api_url,
        'basename'  => '',                  // Router base
        'errorPath' => '/pomolobee_error',  // Route to show on page-level errors
    ]);
});
```

---

### 2.3. Router integration

Add an error route:

```tsx
<Route path="/pomolobee_error" element={<ErrorPage plugin="pomolobee" />} />
```

---

### 2.4. Wrap your app

```tsx
<BrowserRouter basename={(window as any).pomolobeeSettings?.basename || '/'}>
  <ErrorProvider errorPath={(window as any).pomolobeeSettings?.errorPath || '/pomolobee_error'}>
    <ErrorBanner />
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  </ErrorProvider>
</BrowserRouter>
```

---

## 3. Emitting errors

### 3.1. From Axios clients

Use the shared factory:

```ts
export const apiUser = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',
  service: 'user',
  meta: { plugin: 'pomolobee' },  // tag errors with plugin
});
```

Every request error will be normalized by `toAppError`, tagged with `{ plugin: 'pomolobee' }`, emitted on `errorBus`, and shown in the appropriate UI.

---

### 3.2. Manual errors

```ts
const err = toAppError(new Error('Something broke'), {
  code: 'MANUAL',
  severity: 'toast',   // toast = non-blocking; page = full error screen
  category: 'ui',
  service: 'ui',
  functionName: 'onClick',
  meta: { plugin: 'pomolobee' },
});
errorBus.emit(err);
```

---

## 4. Severity levels

* `page` → critical, redirect to **ErrorPage**.
* `toast` → recoverable, show toast/alert via **ErrorBanner**.
* `inline` → local component error, handled where it happens.

**Defaults:**

* 404 from API → `page` severity → redirect.
* Timeout → `toast` severity → stay on page.
* Manual example → you choose.

---

## 5. Components you can use

* **`<ErrorBanner />`**
  Shows the latest non-blocking error.

* **`<ErrorPage plugin="pomolobee" />`**
  Full-page error for blocking errors. Add a route for it.

* **`<ErrorHistoryPage plugin="pomolobee" />`**
  Table of all recorded errors. Useful for debugging.

* **`<ErrorTestButtons apiApp={apiApp} apiUser={apiUser} plugin="pomolobee" />`**
  Dev-only buttons to simulate 404, timeout, manual error.

---

## 6. Example: Error management page

```tsx
import { ErrorTestButtons, ErrorPage, ErrorHistoryPage } from '@bee/common';
import { apiApp, apiUser } from '@utils/api';

export default function PomolobeeErrorMgt() {
  return (
    <>
      <h2>Debug: test some errors</h2>
      <ErrorTestButtons apiApp={apiApp} apiUser={apiUser} plugin="pomolobee" />

      <h3>Active error display</h3>
      <ErrorPage plugin="pomolobee" />

      <h3>Error history</h3>
      <ErrorHistoryPage plugin="pomolobee" />
    </>
  );
}
```

---

## 7. API reference (quick)

```ts
import {
  ErrorProvider,
  ErrorBoundary,
  ErrorBanner,
  ErrorPage,
  ErrorHistoryPage,
  ErrorTestButtons,
  errorBus,
  toAppError,
  friendlyMessage,
  useErrorHistory,
  clearAllErrors,
} from '@bee/common';
```

---

## 8. Expected behaviors

* **404** → normalized to `page` severity → redirects to ErrorPage.
* **Timeout** → normalized to `toast` severity → shown inline.
* **Manual error** → severity depends on what you set.
* **All errors** → appear in ErrorHistoryPage if tagged with `meta.plugin`.

---

## 9. Best practices

* Always tag errors with `meta.plugin`.
* Choose severity carefully: `page` for fatal, `toast` for retryable.
* Add an error management page for development.
* Don’t ship `ErrorTestButtons` in production UI.
* Provide `errorPath` via localized settings or consistent router route.

---

✅ With these steps, any plugin under `wordpress/plugin-src/<plugin>` can integrate the shared error system consistently and predictably.

 