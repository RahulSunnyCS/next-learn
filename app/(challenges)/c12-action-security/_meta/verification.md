# Verification Checklist — Server Action Security: Break It, Then Harden It

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).
- [ ] Navigate to `/c12-action-security` — the page loads without errors.

---

## Registry Discovery

- [ ] Navigate to `/` (the challenge index).  The challenge
  &quot;Server Action Security: Break It, Then Harden It&quot; appears in the list
  with slug `c12-action-security` and tier 2.

---

## Authentication Gate

- [ ] **Unauthenticated rejection (no session cookie).**  Log out from
  `/c01-auth` (clear the `nextmart_session` cookie via DevTools →
  Application → Cookies → Delete).  Navigate to `/c12-action-security`.
  Use the edit-review form and submit.  The page must display an
  &quot;Unauthorized&quot; error and the review must NOT be changed.

- [ ] **Confirm store not mutated.**  After the above rejection, reload
  the page.  The review text shown is identical to the original seed value.

---

## Authorization Gate (IDOR Prevention)

- [ ] **Log in as buyer1.**  Navigate to `/c01-auth` and log in as
  `buyer1@nextmart.dev`.  Return to `/c12-action-security`.

- [ ] **Edit your own review.**  Use the form to update a review that
  belongs to `u-buyer-1` (e.g. `r-001`).  The edit must succeed and the
  updated text must be visible on the page.

- [ ] **Attempt to edit another user&apos;s review.**  Open DevTools → Elements.
  Find the hidden `<input name="reviewId">` in the form.  Change its value
  to `r-002` (owned by `u-buyer-2`).  Submit.  The page must display a
  &quot;Forbidden&quot; error.

- [ ] **Confirm store not mutated on IDOR attempt.**  After the Forbidden
  response, inspect the reviews list — `r-002` must still show `u-buyer-2`&apos;s
  original content.

---

## Validation Gate

- [ ] **Invalid rating (too high).**  Use DevTools to change the rating
  input value to `999`.  Submit.  The page must display a validation error
  (&quot;Bad Request&quot;) and the store must not be mutated.

- [ ] **Invalid rating (too low).**  Change rating to `0`.  Submit.
  Validation error expected.

- [ ] **Empty body.**  Clear the review body field entirely and submit.
  Validation error expected.

- [ ] **Body too long.**  Paste a string longer than 2000 characters into
  the body field and submit.  Validation error expected.

---

## Network Inspection (Server Action mechanics)

- [ ] Open DevTools → Network tab.  Submit a valid edit-review form.
  Observe the POST to the current page URL.
- [ ] Confirm the request has a `Next-Action` header (the action ID).
- [ ] Confirm the request body is the serialised action arguments (not a
  JSON object — Next.js uses its own wire format).
- [ ] Confirm the response contains a revalidation directive or a redirect
  (depending on implementation) rather than a raw JSON API response.

---

## Insecure Solution Isolation

- [ ] Verify that the insecure actions file is never imported by live routes:
  ```bash
  grep -r "solutions/c12-action-security/insecure" app/
  ```
  The result must be empty.

---

## Solution Files Present

- [ ] `solutions/c12-action-security/insecure/actions.ts` exists and contains
  a clearly labelled `INSECURE` action with no auth/authz/validation.
- [ ] `solutions/c12-action-security/insecure/README.md` exists and shows
  attack `curl` commands.
- [ ] `solutions/c12-action-security/secure/actions.ts` exists and is the
  annotated reference implementation.
- [ ] `solutions/c12-action-security/NOTES.md` explains Origin protection
  vs app-level checks and the rate-limit concept.
