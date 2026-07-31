# LFX Core API Setup

1. Create `LFX_Database` in Google Sheets.
2. Open Extensions → Apps Script.
3. Paste `Code.gs`.
4. Add Script properties:
   - `INITIAL_ADMIN_EMAIL`
   - `LFX_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `SITE_URL`
   - `QR_SIGNING_SECRET`
   - optional `ALLOWED_EMAIL_DOMAIN`
   - optional `AUTO_PROVISION_USERS=true`
5. Run `setupLFX()`.
6. Deploy as Web App, execute as Me, access Anyone.
7. Put the `/exec` URL in Vercel as `LFX_API_URL`.
8. Put the same API key in Vercel as `LFX_API_KEY`.
9. Set `NEXT_PUBLIC_DEMO_MODE=false` and redeploy.

Do not place API keys in Google Sheets or source code.
