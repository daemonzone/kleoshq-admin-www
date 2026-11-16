# kleoshq-admin-www

Admin UI for SiteWitness. One user (the owner), TOTP login — no passwords, no accounts. Next.js 16 (App Router),
its own Vercel project, its own Postgres role.

| Page | What it does |
|---|---|
| `/beta` | Beta testing applications by status (pending, approved, active, declined, …), places used `X / BETA_SLOTS`. **Approve** (sends "you are in"), **Decline** (sends "maybe next time"), **Cancel**, **Resend** the approval mail, **Revoke** (approved or active: ends the `pro_beta` plan at once, the user goes back to Free, a reason is mandatory and audited; the same e-mail cannot apply again). Optional internal note. For activated applications it lists the sites the user actually connected, next to the declared one, with a "matches / differs" badge (informational: nothing is enforced). |
| `/` | Counters: pending beta, stuck reports, sites, active subscriptions per plan, AI vs total analyses (30 days). |
| `/sites` | Monitored sites: URL, status, last report, scans, how many used the AI, owner's e-mail, team members on the site (+ pending invites), plan. The owner's e-mail is best-effort (team → plugin connect → order, source shown): the user table is in Supabase Auth. |
| `/pipeline` | Reports not analysed after 15 minutes; analyses per month: AI / official checksums / none / pending. |
| `/email` | Messages received through the contact form (`contact_submissions`): sender, topic, spam quarantine, text when it was stored. Accepted messages keep no text (they go to support by e-mail); quarantined ones do. |
| `/audit` | `audit_logs`: every login attempt and every change made here (before → after, IP). |

## Security model
- **Login:** the 6-digit code of an authenticator app (RFC 6238, ±1 step). A code can't be used twice (its time-step
  is stored with the login in `audit_logs`). 5 failed attempts from one IP, or 20 overall, lock the login for 15 minutes.
- **Session:** an HMAC-signed `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookie, 8 hours. `proxy.ts` is the first
  gate; every page and server action calls `requireAdmin()` again.
- **Database:** role `kleos_admin` (`stuff/db/scripts/create-admin-role.sql`): `SELECT` on what the pages show, `UPDATE`
  on the decision columns of `beta_testing_applications` only, `INSERT` on `audit_logs` (no update/delete), nothing
  else. A decision and its audit row are written in one transaction.
- No IP allow-list for now. Responses are `no-store`, `X-Frame-Options: DENY`, `noindex`.

## Setup
1. `npm run totp:init` → put `ADMIN_TOTP_SECRET` in the environment and add the secret to the authenticator app.
   Generate `ADMIN_SESSION_SECRET` with `openssl rand -hex 32`.
2. Run migration `0034`, then `create-admin-role.sql` (password on the command line, see the script) and use that role's
   URL as `DATABASE_URL`.
3. Point `NOTIFICATIONS_SERVICE_URL` / `NOTIFICATIONS_INTERNAL_SECRET` at kleoshq-notifications, `PUBLIC_SITE_URL` at the
   public site (the links in the approval mail).

Local: `docker compose up -d admin-www` → http://localhost:4008. The compose file uses a well-known **dev-only** TOTP secret
(`JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`) and `admin_dev_password` for the role; apply the role script locally first:
`docker exec -i kleoshq-postgres psql -U kleos -d kleoshq_development -v admin_password=admin_dev_password < stuff/db/scripts/create-admin-role.sql`.

Tests: `npm test` (TOTP against the RFC vectors, session tokens).

## Not built yet
Users/subscriptions management and "assign a plan with one click": the users' e-mail addresses live in Supabase Auth,
not in Postgres, so they need the Supabase service-role key. A beta applicant gets `pro_beta` automatically when the
public site sees their approved e-mail sign in, not from here.
