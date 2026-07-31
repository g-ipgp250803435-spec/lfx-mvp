# Jules / Coding Agent Instructions

## Product
LEGASI FINANCE X (LFX) is an IPG Student Representative Council Treasury Office Operating System. Maintain a formal, trustworthy, premium institutional visual identity.

## Commands
Before completing a change, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Architecture contracts
- Next.js App Router lives under `app/`.
- Public and admin browser calls go through `/api/lfx`.
- The Google Apps Script backend uses an `action` value, not physical REST paths.
- Do not expose `LFX_API_URL`, `LFX_API_KEY`, Google Drive folder IDs or signing secrets to client code.
- Only environment variables intentionally prefixed `NEXT_PUBLIC_` may be used in client components.
- Production identity must use Google Identity Services ID tokens.
- Apps Script must verify Google tokens and ADMIN role; frontend checks are not security boundaries.

## Database contracts
Do not rename existing sheet names or headers without a migration and documentation update:
- `tbl_users`
- `tbl_assets`
- `tbl_loans`
- `tbl_ikes`
- `tbl_tabung`
- `tbl_announcements`
- `tbl_audit`
- `tbl_content`

Every mutating Apps Script action must write to `tbl_audit`.

## Business rules
- iKES Care: RM30 or RM50 only.
- iKES Go-Home: actual ticket price, maximum RM100, ticket proof required.
- iKES records bank status only; it must never claim to execute a transfer.
- Loan transitions: PENDING → APPROVED/REJECTED; APPROVED → ACTIVE; ACTIVE → RETURNED.
- Asset transitions during scan: AVAILABLE → ON_LOAN → AVAILABLE.
- Do not expose iKES applicant data, ticket proof or private loan data on public pages.
- Tabung Jumaat donation is an external payment link/QR, not an in-app payment processor.

## Content and design
- Every public-facing content feature should support BM and English.
- Keep keyboard accessibility, visible focus, semantic headings and adequate contrast.
- Preserve dark mode.
- Avoid adding large UI libraries unless clearly justified.
- Keep demo mode working when the Google API is not configured.

## Safe changes
- Prefer small modular components.
- Add types before adding API fields.
- Validate data in Apps Script even when the frontend already validates it.
- Never log ID tokens, API keys, signing secrets or ticket file contents.
