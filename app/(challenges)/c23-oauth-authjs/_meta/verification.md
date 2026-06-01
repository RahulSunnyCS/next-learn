# Verification Checklist — Real OAuth with Auth.js (next-auth v5)

> **Purpose:** A human-runnable checklist to verify the challenge is working
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors in challenge files.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).
- [ ] A warning appears in the server console:
  `[c23-oauth-authjs] AUTH_SECRET env var is not set. Using an insecure hardcoded fallback`
  (This is expected when `AUTH_SECRET` is not in `.env.local`.)

---

## Functional Checks — Credentials Provider

- [ ] **Navigate to the challenge** — Go to `/c23-oauth-authjs`.  The page
  loads showing the "Live Session Demo" panel with sign-in buttons.

- [ ] **Sign in with Credentials** — Click "Alex Chen (seller)".  The page
  reloads showing:
  - "Signed in" banner with the user's name and email.
  - Role: `seller`.
  - The raw session JSON (inspect it — confirm it contains no password or
    server-secret material).

- [ ] **Session persists** — Reload the page without doing anything else.
  The session is still active (the Auth.js cookie is present).

- [ ] **Sign out** — Click "Sign out".  The page reloads showing
  "No active Auth.js session."

- [ ] **Repeat for buyer** — Sign in as "Jamie Rivera (buyer)".  Confirm
  Role shows `buyer`.

---

## Functional Checks — Protected Page

- [ ] **Unauthenticated redirect** — While signed out, navigate to
  `/c23-oauth-authjs/protected`.  You are immediately redirected to
  `/c23-oauth-authjs`.

- [ ] **Authenticated access** — Sign in with a Credentials demo user.
  Then navigate to `/c23-oauth-authjs/protected`.  The "Access Granted"
  panel appears showing your name, email, and role.

- [ ] **Protected sign-out** — Click "Sign out" on the protected page.
  You are sent back to the challenge root showing "No active Auth.js session."

---

## Cookie Attribute Checks

After signing in, open DevTools → Application → Cookies → http://localhost:3000.

- [ ] `authjs.session-token` (or `__Secure-authjs.session-token` in prod) is
  listed.
- [ ] **HttpOnly** column shows a checkmark for that cookie.
- [ ] **SameSite** column shows "Lax".
- [ ] The `authjs.session-token` cookie is distinct from `nextmart_session`
  (C01) — both can coexist.

---

## GitHub OAuth Checks (optional — requires env vars)

These checks require `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `.env.local`
and the GitHub provider uncommented in `_lib/auth-config.ts`.

- [ ] **Set up OAuth App** — Create a GitHub OAuth App at
  https://github.com/settings/applications/new with callback URL
  `http://localhost:3000/c23-oauth-authjs/api/auth/callback/github`.

- [ ] **Configure env** — Add `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` to
  `.env.local`.  Uncomment the `import GitHub` and `GitHub({})` lines in
  `_lib/auth-config.ts`.  Restart the dev server.

- [ ] **Sign in with GitHub** — Click "Sign in with GitHub".  You are
  redirected to GitHub's authorization page.  Approve.  You are redirected
  back and signed in with your GitHub name and email.

- [ ] **Inspect Network tab** — During the GitHub redirect, confirm the
  authorization URL in the network log contains `&state=<nonce>`.

- [ ] **State verification** — In DevTools, find the `authjs.pkce.code_verifier`
  or `authjs.state` cookie set during the GitHub redirect.  After callback,
  confirm it is cleared (Auth.js deletes nonce cookies after use).

---

## Discovery Check

- [ ] **Challenge appears in index** — Navigate to `/`.  The challenge
  "Real OAuth with Auth.js (next-auth v5)" appears in the challenge index
  with slug `c23-oauth-authjs` and tier 4.

---

## Architecture Checks

- [ ] **No dynamic route-segment exports** — Search for forbidden directives:
  ```bash
  grep -r "export const dynamic\|export const runtime\|export const fetchCache" \
    "app/(challenges)/c23-oauth-authjs/"
  ```
  The result must be empty.

- [ ] **auth() calls inside Suspense** — In `page.tsx` and `protected/page.tsx`,
  `auth()` is called only inside async functions that are children of
  `<Suspense>` boundaries — never at the top-level page component.

- [ ] **No forbidden imports** — Confirm `_lib/auth-config.ts` does NOT import
  from `lib/auth/**` or `proxy.ts`:
  ```bash
  grep "lib/auth" "app/(challenges)/c23-oauth-authjs/_lib/auth-config.ts"
  ```
  The result must be empty.

- [ ] **Session cookie isolation** — The Auth.js cookie name
  (`authjs.session-token`) differs from C01's cookie name (`nextmart_session`).
  Both can be active simultaneously without interference.
