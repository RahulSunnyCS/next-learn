# Verification Checklist — Session Security: Attack the Toy, Then Build It Right

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Functional Checks

- [ ] **Login flow** — Navigate to `/c01-auth`.  Click "Log in as Alice".
  The page refreshes showing "Logged in as Alice (buyer)".

- [ ] **Session persists** — Reload the page without clicking anything.
  The session is still shown (the cookie is present and valid).

- [ ] **Logout flow** — Click "Log out".  The page shows "No active session".
  The `nextmart_session` cookie is no longer present in DevTools
  (Application → Cookies → localhost).

- [ ] **httpOnly flag** — After logging in, open the browser console and run
  `document.cookie`.  The `nextmart_session` cookie does NOT appear in the
  output (it is httpOnly and invisible to JavaScript).

- [ ] **Tamper rejection** — After logging in, copy the raw `nextmart_session`
  cookie value from DevTools.  Decode the payload with
  `JSON.parse(atob(value.split('.')[1]))` in the console.  Modify a field,
  re-encode, and paste it back as the cookie value.  Reload — the page shows
  "No active session" (the tampered token is rejected).

- [ ] **Challenge appears in index** — Navigate to `/`.  The challenge
  "Session Security — Attack the Toy, Then Build It Right" appears in the
  challenge index with slug `c01-auth`.

---

## Cookie Attribute Checks

After logging in, open DevTools → Application → Cookies → http://localhost:3000.

- [ ] `nextmart_session` is listed.
- [ ] **HttpOnly** column shows a checkmark (or "✓") for that cookie.
- [ ] **SameSite** column shows "Lax".
- [ ] **Expires / Max-Age** is approximately 24 hours in the future.
- [ ] (Development only) **Secure** column shows no checkmark — this is
  expected because `NODE_ENV !== "production"` on localhost.

---

## Security: Server-Only Secret

- [ ] Run `npm run build` and then inspect `.next/static/chunks/` for any file
  containing the string `SESSION_SECRET`.  No such file should exist — the
  secret is server-side only and must never be bundled into the client.

- [ ] Open the Network tab in DevTools, reload the page, and inspect the HTML
  response.  The string `SESSION_SECRET` does not appear anywhere in the
  response body.

---

## Insecure Toy Isolation

- [ ] Search the codebase for imports of `solutions/c01-auth/insecure/`:
  ```bash
  grep -r "solutions/c01-auth/insecure" app/
  ```
  The result must be empty — the insecure toy is NEVER imported by a live
  application route.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c01`

- [ ] All tests pass.
