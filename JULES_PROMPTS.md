# Suggested Jules Tasks

## 1. Repository health
Read `AGENTS.md` and `README.md`. Install dependencies, run lint, typecheck and build, then fix only verified errors. Preserve the visual identity and all Apps Script action names.

## 2. Add student application tracking
Create a signed-in student dashboard showing only the current user's iAset and iKES records. Add Apps Script actions that derive the email exclusively from the verified Google ID token. Never trust an email supplied by the client.

## 3. Add admin media uploader
Create a reusable Drive media uploader using the existing `file/upload` action. Support logo, favicon, asset image, announcement PDF, donation QR and officer photo. Enforce file type and size both client-side and in Apps Script.

## 4. Add rejection-reason dialogs
Replace direct reject buttons with accessible confirmation dialogs requiring a reason. Store the reason in audit details and include it in the applicant email.

## 5. Add dashboard charts
Add lightweight SVG charts for monthly Tabung Jumaat collection/distribution and asset utilisation. Do not introduce a chart library unless bundle impact is justified.

## 6. Add overdue notifications
Add an Apps Script time trigger that checks ACTIVE loans daily and emails borrowers/admins for overdue assets. Record every notification in `tbl_audit` and avoid duplicate daily messages.

## 7. Improve content page builder
Expand custom pages with typed blocks: rich text, image, call-to-action, FAQ and document list. Maintain bilingual fields, safe rendering and backward compatibility with existing content JSON.
