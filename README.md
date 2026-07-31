# LEGASI FINANCE X (LFX)

**One platform. All Treasury Office affairs.**

A deploy-ready Office Operating System for the Treasury Office of an IPG Student Representative Council. It combines a polished public portal, student application flows, a real-time operations dashboard and a bilingual content studio.

## Included modules

- **iAset** — public availability, Google-login applications, approval/rejection, signed QR handover and return, asset status and loan history.
- **iKES** — iKES Care (RM30/RM50), iKES Go-Home (maximum RM100), ticket proof upload, approval, paid and repaid records.
- **Digital Tabung Jumaat** — weekly target, monthly collection/distribution, annual balance, public distribution records and donation CTA.
- **Announcement Centre** — bilingual notices, categories, attachment URLs and WhatsApp sharing.
- **Organisation Chart** — interactive officer cards, portfolios, official email and responsibilities.
- **LFX Studio** — edit site identity, colours, logo/favicon URLs, hero, menus, donation information, custom pages, assets, iKES, Tabung records, announcements and organisation.
- BM/English switch, dark mode, responsive design, SEO, sitemap, PWA manifest and accessible controls.
- Demo Mode for immediate preview before Google services are connected.

## Technology

- Next.js App Router + TypeScript
- Vercel
- Google Apps Script Web App (LFX Core API)
- Google Sheets database
- Google Drive file storage
- Google Identity Services

## 1. Deploy the frontend

1. Upload every file in this project to the root of a new GitHub repository.
2. Import the repository in Vercel.
3. Add these environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
LFX_API_URL=
LFX_API_KEY=
```

4. Deploy. The full website works with sample data in Demo Mode.

## 2. Create the Google Sheets database

1. Create a Google Spreadsheet named `LFX_Database`.
2. Open **Extensions → Apps Script**.
3. Replace the default code with `apps-script/Code.gs`.
4. Open **Project Settings**, enable the manifest file, and use `apps-script/appsscript.json` if desired.
5. In **Project Settings → Script properties**, create:

| Property | Value |
|---|---|
| `INITIAL_ADMIN_EMAIL` | Your campus Google email |
| `LFX_API_KEY` | A random secret of at least 32 characters |
| `GOOGLE_CLIENT_ID` | OAuth Web Client ID created in step 3 |
| `ALLOWED_EMAIL_DOMAIN` | Optional, e.g. `student.ipgm.edu.my` |
| `SITE_URL` | Your production Vercel URL |
| `QR_SIGNING_SECRET` | A separate random secret, recommended |
| `AUTO_PROVISION_USERS` | `true` to create student USER records on first login |

6. Select and run `setupLFX()` once. Approve the requested Google permissions.
7. The function creates all sheets, formats headers, creates an `LFX_Uploads` Drive folder and inserts the initial admin.

Created sheets:

- `tbl_users`
- `tbl_assets`
- `tbl_loans`
- `tbl_ikes`
- `tbl_tabung`
- `tbl_announcements`
- `tbl_audit`
- `tbl_content`

CSV header templates are also included under `database-templates/`.

## 3. Configure Google login

1. Open Google Cloud Console and select/create a project.
2. Configure the OAuth consent screen.
3. Create an **OAuth Client ID → Web application**.
4. Add authorised JavaScript origins:
   - `http://localhost:3000`
   - your Vercel production URL
   - your custom domain, when available
5. Copy the client ID.
6. Use the same ID for:
   - Vercel: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - Apps Script property: `GOOGLE_CLIENT_ID`

The browser obtains a Google ID token. LFX Core API verifies that token with Google, checks the OAuth audience, optionally checks the campus email domain, and then checks `tbl_users` for ADMIN access.

## 4. Deploy LFX Core API

1. In Apps Script, choose **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.

`Anyone` is required because the Vercel server calls the Web App. Mutating requests are still protected by the server-only `LFX_API_KEY`, while user and admin operations also require a verified Google ID token.

5. Deploy and copy the URL ending in `/exec`.
6. In Vercel, set:

```env
LFX_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
LFX_API_KEY=the-exact-same-secret-as-the-script-property
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
```

7. Redeploy the Vercel project. Environment variable changes only affect new deployments.

## 5. First production login

1. Open `/admin`.
2. Sign in using the email configured as `INITIAL_ADMIN_EMAIL`.
3. Open **Content** and click **Save website content**. This writes the default CMS content into `tbl_content`.
4. Replace all placeholder officer details, bank information, payment link, donation QR and official email.
5. Add additional admins directly in `tbl_users` with role `ADMIN` and `is_active` set to `TRUE`.

## Donation setup

LFX does not process money itself. The **Donate now** button opens the payment URL configured in LFX Studio, and the page displays editable bank details and a DuitNow QR image.

Before production:

- replace the placeholder payment link;
- replace the placeholder account number;
- upload the official DuitNow QR to Drive or another approved host;
- paste its public image URL into LFX Studio;
- test the receiving account with a small controlled payment.

## QR flow

When an admin approves a loan, Apps Script creates a signed link:

```text
/loan/verify?loanId=...&token=...
```

The student receives this link by email and the page renders it as a QR code. At handover, the admin scans it to move `APPROVED → ACTIVE`; at return, scanning again moves `ACTIVE → RETURNED` and restores the asset to `AVAILABLE`.

Use HTTPS in production and keep `QR_SIGNING_SECRET` private.

## Demo Mode

With `NEXT_PUBLIC_DEMO_MODE=true`:

- data is stored in the current browser's `localStorage`;
- demo Google login is available;
- admin changes are visible in that browser;
- no email, Google Sheet, Drive or bank transaction occurs.

Demo data must not be treated as an official record.

## Jules AI

Connect this GitHub repository to Jules. Jules should read `AGENTS.md` before modifying the project. Ready-to-use tasks are included in `JULES_PROMPTS.md`.

Recommended first Jules task:

> Read AGENTS.md and README.md. Run lint, typecheck and build. Fix only verified issues without changing the visual identity, API action names or Google Sheets column headers.

## Security checklist before launch

- Restrict Google login with `ALLOWED_EMAIL_DOMAIN` where possible.
- Use a unique `LFX_API_KEY` and `QR_SIGNING_SECRET`.
- Do not commit `.env.local` or Script property values.
- Keep the Apps Script deployment owned by an official institutional account.
- Review Drive sharing policy for ticket proofs; they contain personal data.
- Do not display iKES applicant identities publicly.
- Regularly export or back up the spreadsheet.
- Protect admin accounts with Google multi-factor authentication.
- Review `tbl_audit` periodically.
- Publish a privacy notice and data-retention schedule approved by the institution.

## Useful commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```
