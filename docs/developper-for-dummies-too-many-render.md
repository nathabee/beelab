

# React “Too Many Renders” — a **for-dummies** cheat sheet (WordPress plugin edition)

> Goal: stop the *“Maximum update depth exceeded”* / *“deps change on every render”* mess with simple rules + copy-paste fixes.


totally—here’s the “for dummies” version of what went wrong and what changed, using your **logout** flow as the concrete example.

---

## The core rule React cares about

React doesn’t “look inside” your dependencies. It just checks:
**“Is this the exact same thing as last time?”** (same reference/identity)

* **Objects & functions** get a **new identity** every render *unless* you wrap them with `useMemo` / `useCallback`.
* If an effect depends on something whose identity keeps changing, React thinks the deps “changed” → it reruns the effect.

If that effect **sets state**, it causes a render → deps change again → effect runs again… **loop** →

> “Maximum update depth exceeded.”

---

## What was happening when we have too many render

1. **AuthProvider** created a **brand-new `value` object** on *every* render (you computed a memo but didn’t use it), and the functions inside (`logout`, `login`, etc.) were **re-created each render** too.

2. In some consumer code (e.g. your reports hook), you had patterns like:

   * Depending on **the whole context object** or
   * Depending on **a function from context** (e.g. `logout`) or
   * Building a callback that depends on that function, then an effect that depends on that callback.

   Example pattern (simplified):

   ```ts
   const { logout } = useApp();
   const fetchReports = useCallback(..., [logout]); // changes every render because logout changes
   useEffect(() => { 
     setLoading(true);   // sets state
     // ...
   }, [fetchReports]);   // effect runs again every render
   ```

3. That effect **sets state** (`setLoading`, `setError`, etc.) → triggers **another render** → context `value` and `logout` get **new identities again** → effect fires again → state changes again → **infinite loop** → the error.

4. Bonus rough edge: in your `fetchReports`, when the token was bad you called `logout()` but **didn’t return early**, then flipped `loading`/`error` in a confusing order. That didn’t *cause* the loop, but it added noisy rerenders.

---

## What should happens 

when you click “Logout”

You fixed two things:

1. **Stabilized identities**

   * Wrapped `logout`, `login`, and setters in **`useCallback`** → their identity stays the **same between renders**.
   * Wrapped the provider `value` in **`useMemo`** **and** actually **passed that memo** to `<AuthContext.Provider value={value}>`.

   Result: Consumers no longer see “new” `logout`/`value` on every render.

2. **Cleaned the reports hook**

   * `fetchReports` returns **immediately** after calling `logout()` for an invalid token.
   * It sets `loading`/`error` in a consistent order.

**Timeline now:**

* You call **logout**.
* `logout` (stable function) clears storage and sets several pieces of state **once**.
* Those state changes make `value` (memo) change **once** (because its inputs changed).
* Components that depend on **primitives** like `isAuthenticated`, `userId`, etc. update and any effects that depend on those **run once**.
* No further identity thrashing → **no loop**.

---

## Quick mental model (sticky note)

* ✅ Depend on **primitives** in effects: `user?.id`, `isAuthenticated`, `roleNames.join(',')`
* ✅ Wrap **functions you export via context** in `useCallback`
* ✅ Wrap your **context `value`** in `useMemo` and **use that memo**
* ❌ Don’t put **whole objects** (e.g., `auth`) or **inline objects/functions** in dep arrays
* ❌ Don’t have **conditional dep arrays** (`cond ? [a] : [a,b]`)

If you remember just one thing:
**“Objects/functions change identity every render unless memoized. Effects look at identity.”**


---

## TL;DR rules

1. **Effects depend on identity, not content.**
   Objects/functions are “new” every render unless you memoize them.
2. **Never put whole objects or inline values in deps.**
   Depend on **primitives** (ids, booleans, strings) or **memoized** things.
3. **If an effect sets state, its deps must be stable.**
   Unstable deps → effect runs again → setState → render → loop.
4. **For context:** `useCallback` your functions, `useMemo` your `value`, and **use that memo**.
5. **Fixed dep-array shape.**
   No conditional dep arrays (`cond ? [a] : [a,b]`). Use `[a, cond ? b : null]`.

---

## The 5 golden patterns

### 1) Context Provider (copy-paste recipe)

```tsx
// ✅ Stable context
const login  = useCallback((t,u)=>{/*...*/}, []);
const logout = useCallback(()=>{/*...*/}, []);

const value = useMemo(() => ({
  token, isAuthenticated, user,            // state
  login, logout, setToken,            // stable funcs (callbacks!)
}), [token, isAuthenticated, user]);       // primitives only

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

**Don’t do this:**

```tsx
// ❌ new object + new functions every render
<AuthContext.Provider value={{ token, login: ()=>{}, logout: ()=>{} }}>
```

### 2) Effects: no inline deps, no big objects

```tsx
// ❌ BAD: inline object/array/function → new every render
useEffect(() => { /* ... */ }, [ {a}, [b], () => doThing(c) ]);

// ✅ GOOD: memoize first
const opts = useMemo(() => ({a}), [a]);
const list = useMemo(() => [b], [b]);
const cb   = useCallback(() => doThing(c), [c]);
useEffect(() => { /* ... */ }, [opts, list, cb]);

// ❌ BAD: depending on a whole context/prop object
const auth = useApp();
useEffect(() => { /* ... */ }, [auth]);

// ✅ GOOD: depend on primitives you use
const { isAuthenticated, user } = useApp();
useEffect(() => { /* ... */ }, [isAuthenticated, user?.id]);
```

### 3) Effects: fixed shape

```tsx
// ❌ BAD
useEffect(() => { /* ... */ }, condition ? [a] : [a,b]);

// ✅ GOOD
useEffect(() => { /* ... */ }, [a, condition ? b : null]);
```

### 4) Async fetch pattern (no accidental loops)

```tsx
const fetchStuff = useCallback(async () => {
  setLoading(true);
  setError(false);

  try {
    const data = await api.get('/things');
    setData(data);
  } catch {
    setError(true);
  } finally {
    setLoading(false);
  }
}, []); // deps stable or memoized

useEffect(() => { fetchStuff(); }, [fetchStuff]);
```

> If you use `logout()` inside, make sure **`logout` is a `useCallback`** in context, then include it in deps or early-return after calling it.

### 5) Guard state updates (prevents ping-pong)

```tsx
useEffect(() => {
  const next = compute(a,b);
  setX(prev => (Object.is(prev, next) ? prev : next));
}, [a,b]);
```

---

## Debugging playbook (fast)

1. **Find the looping effect**

   ```js
   const useLoggedEffect = (name, fn, deps) => { console.count(`effect:${name}`); return useEffect(fn, deps); };
   // usage:
   useLoggedEffect('ShortReports:fetch', () => { /* ... */ }, [fetchReports]);
   ```

   The one with a **rapidly increasing count** is your culprit.

2. **Search for common foot-guns**

   * Effects with **no dep array** *and* a `setState`: likely runs on every render.
   * Dep arrays with **inline** object/array/function.
   * Dep arrays that include **whole context objects** or **unstable functions**.

3. **Fix identity**

   * `useCallback` exposed functions.
   * `useMemo` provider `value` **and pass that memo**.
   * Depend on primitives.

---

## WordPress specifics (so your plugins don’t fight React)

* Prefer **externalizing React** (one React on the page):

  ```js
  // webpack.externals
  {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react-dom/client': 'ReactDOM',
    'react/jsx-runtime': 'ReactJSXRuntime',
    '@wordpress/element': 'wp.element',
  }
  ```

  Enqueue with PHP deps: `['react','react-dom','wp-element']`.

* Interactivity API dev logs (with `SCRIPT_DEBUG=true`) can warn:
  *“dependencies change on every render”*. That’s usually unstable deps in a block.
  **Fix them the same way**: memoize and depend on primitives.

---

## Quick checklist (before you commit)

* [ ] Provider functions wrapped in `useCallback`.
* [ ] Provider `value` wrapped in `useMemo` **and used**.
* [ ] No effect depends on a **whole object** (context/props).
* [ ] No **inline** objects/arrays/functions in dep arrays.
* [ ] No **conditional** dep arrays; dep list has a fixed shape.
* [ ] Any effect that **sets state** depends only on **stable** stuff.
* [ ] For arrays in deps: use a **stable key** like `.map(x=>x.id).join(',')` if needed.
* [ ] Fetch functions `useCallback`’d; effects call them and include them in deps.
* [ ] (WP) Both plugins share the **same React strategy** (externalized).

---

## Mini FAQ

**Q: Why does React rerun my effect when the object “looks” the same?**
Because it compares **identity**, not deep equality. `{a:1}` !== `{a:1}` across renders.

**Q: When do I use `useMemo` vs `useCallback`?**

* `useCallback` → memoize **functions**
* `useMemo` → memoize **values/objects/arrays**

**Q: Can I put the whole `auth` in deps to be safe?**
No. Depend on **specific fields** you actually read: `auth.isAuthenticated`, `auth.user?.id`.

---

## Copy-paste “safe” boilerplates

**Stable provider**

```tsx
const someAction = useCallback(() => {/*...*/}, []);
const value = useMemo(() => ({ stateA, stateB, someAction }), [stateA, stateB]);
return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
```

**Effect with computed state**

```tsx
useEffect(() => {
  const next = computeFrom(a, b);
  setState(prev => (Object.is(prev, next) ? prev : next));
}, [a, b]);
```

**Fetch once with retries**

```tsx
const load = useCallback(async () => { /* ... */ }, []);
useEffect(() => { load(); }, [load]);
```

---

Keep this sheet near your editor. If anything still loops, paste the effect and I’ll point out the unstable dep.
