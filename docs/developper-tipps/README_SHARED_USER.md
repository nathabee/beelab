# Shared User Scaffold

This tarball contains a neutral, shared **UserContext** and helpers to centralize login/logout, token storage, and role checks across multiple plugins (e.g., Pomolobee and Competence).

## What’s inside

```
shared/user/
  api.ts
  config.ts
  index.ts
  jwt.ts
  storage.ts
  types.ts
  userBus.ts
  UserContext.tsx
  RoleGuard.tsx
  components/
    DemoToggle.tsx
    LoginButton.tsx
    LogoutButton.tsx
shared/http/
  axiosInstance.ts   (optional)
```

## How to integrate (Pomolobee first)

1. **Add providers at app root**:

```tsx
import { UserProvider } from 'shared/user/UserContext';

// Wrap above AppProvider
<UserProvider wpGlobalKeys={['pomolobeeSettings','competenceSettings']} envPrefixes={['POMOLOBEE','COMPETENCE']}>
  <AppProvider>{/* ... */}</AppProvider>
</UserProvider>
```

2. **Create `AppContext`** in pomolobee to hold only domain state (init/reset). Subscribe to `userBus` if needed.

3. **Replace `useApp()`** usages:
   - User/token/roles → `useUser()`
   - App domain state → `useApp()`

4. **Export in your shared barrel**:
   - In `shared/index.ts` add: `export * from './user';`

5. **(Optional) axios**:
   - Use `shared/http/axiosInstance.ts` to attach Authorization header via `getToken()` if you prefer axios.

## Notes

- `resolveApiBase` finds API base from WordPress globals or envs. Supply `wpGlobalKeys` & `envPrefixes` that match your setup.
- `userBus` emits `emitLogin(user)` and `emitLogout()` so app contexts can initialize/reset cleanly.
- The API functions are `fetch`-based to avoid extra deps; swap to axios easily if desired.
