# Deploy Notes — Nextmart on Vercel

> **Status:** Template / pending learner deployment
> **Target platform:** Vercel (free tier — sufficient for this curriculum)
> **Updated:** 2026-06-01

---

## Live URL

> _Fill in after deployment:_
> `https://_____.vercel.app`

---

## Prerequisites

- Node.js 22+ (matches the TypeScript types in `@types/node`)
- A Vercel account (free tier at vercel.com)
- The repository pushed to GitHub (or GitLab / Bitbucket)

---

## Step-by-Step Deployment

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/next-learn.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** and select your `next-learn` repo.
3. Leave the **Framework Preset** as **Next.js** — Vercel detects it automatically.
4. Leave **Root Directory** blank (the `app/` and `next.config.ts` are at the
   repo root).
5. Do NOT click Deploy yet — set environment variables first.

### 3. Set Environment Variables

In Vercel → Settings → Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `SESSION_SECRET` | 64-char hex string | **Required.** Signs/verifies JWTs. Never commit this value. Generate it with the command below. |
| `NODE_ENV` | `production` | Set automatically by Vercel — you do not need to add this manually. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-deployment.vercel.app` | Used in sitemap and OG tags. Update after first deploy to get the real URL, then redeploy. |

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
This generates a 64-character hex string (32 bytes = 256 bits of entropy).

### 4. Deploy

Click **Deploy**. The Vercel build log should show:
```
▲ Next.js 16.2.6 (Turbopack)
- Cache Components enabled
✓ Compiled successfully
✓ Generating static pages (NN/NN)
```

Exit code must be 0. If the build fails, check the log for TypeScript errors
or missing environment variables.

### 5. Verify the Deployment

After the deployment URL is assigned:

```bash
# Check the challenge index
curl -I https://your-deployment.vercel.app/

# Check robots.txt
curl https://your-deployment.vercel.app/robots.txt

# Check sitemap.xml
curl https://your-deployment.vercel.app/sitemap.xml

# Check a challenge page
curl -I https://your-deployment.vercel.app/c01-auth
```

---

## Challenge-Specific Caveats

### C01 — Session Security
Requires `SESSION_SECRET` to be set. If missing, `lib/auth/session.ts` will
throw on any login attempt. ✅ Covered by the environment variable above.

### C23 — OAuth with Auth.js
Requires additional provider credentials:
- `AUTH_SECRET` — generate like SESSION_SECRET above.
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` — from a GitHub OAuth App
  (Settings → Developer settings → OAuth Apps → New OAuth App).
  - Homepage URL: `https://your-deployment.vercel.app`
  - Callback URL: `https://your-deployment.vercel.app/c23-oauth-authjs/api/auth/callback/github`

Without these, the OAuth challenge page will warn about a missing AUTH_SECRET
but other challenges will still work.

### C20 — Deployment (the challenge itself)
C20 teaches the difference between `output: 'export'` (static), `output:
'standalone'` (Docker/Node), and Vercel's default serverless output. Since
`next.config.ts` is frozen (do not modify it), you cannot change the output
mode for the live deployment — the challenge is designed to be explored in a
local dev environment by temporarily uncommenting config variants documented
in the spec.

---

## Redeployment

After updating `NEXT_PUBLIC_SITE_URL` to the actual Vercel URL:
1. Vercel → Settings → Environment Variables → edit `NEXT_PUBLIC_SITE_URL`.
2. Go to Deployments → click the latest deployment → Redeploy.
3. Verify `/sitemap.xml` now lists the correct domain.

---

## Monitoring

Vercel provides built-in:
- **Analytics** — Core Web Vitals from real users (after 28 days of traffic).
- **Speed Insights** — Lighthouse-equivalent scores per deployment.
- **Runtime logs** — Available in Vercel Dashboard → Logs.

For error tracking in production, consider adding Sentry:
```bash
# Do NOT run this in this repo (package.json is frozen) — document only
npx @sentry/wizard@latest -i nextjs
```
