/**
 * LEGASI FINANCE X (LFX) Core API
 * Google Apps Script V8 runtime
 *
 * Deploy as a Web App after running setupLFX().
 * Store secrets in Project Settings > Script properties.
 */

const TABLES = {
  users: ["user_id", "full_name", "role", "is_active"],
  assets: ["asset_id", "name", "category", "image_url", "status", "description"],
  loans: ["loan_id", "asset_id", "user_id", "purpose", "request_date", "approved_by", "status", "qr_code_url", "date_borrowed", "date_returned_expected", "date_returned_actual"],
  ikes: ["application_id", "user_id", "type", "amount_requested", "ticket_proof_url", "status", "request_date", "approved_by", "notes", "amount_approved", "repayment_term_days", "decision_date", "payment_date", "repayment_due_date", "amount_repaid", "outstanding_amount", "is_overdue", "rejection_reason", "intake", "class_name", "phone_number", "bank_account_number", "bank_name"],
  tabung: ["record_id", "type", "amount", "date", "description", "recorded_by", "recipient"],
  announcements: ["announcement_id", "title", "content", "category", "attachment_url", "publish_date", "created_by", "responsible_officer"],
  audit: ["timestamp", "user_id", "action", "details"],
  content: ["content_key", "json_content", "updated_at", "updated_by"]
};

function doGet(e) {
  try {
    const action = clean_(e && e.parameter && e.parameter.action);
    const params = (e && e.parameter) || {};
    switch (action) {
      case "content/get": return json_({ ok: true, data: getSiteContent_() });
      case "organisation/get": return json_({ ok: true, data: getOrganisationItems_() });
      case "ikes/options": return json_({ ok: true, data: [
        "PPISMP Ambilan Ogos 2026 Keluaran Julai 2027",
        "PISMP Ambilan Ogos 2026 Keluaran Julai 2030",
        "PISMP Ambilan 2025 Keluaran Julai 2029",
        "PISMP Ambilan Ogos 2024 Keluaran Julai 2028",
        "PISMP Ambilan Ogos 2023 Keluaran Julai 2027"
      ] });
      case "assets/list": return json_({ ok: true, data: listAssets_(false) });
      case "tabung/list": return json_({ ok: true, data: rows_("tbl_tabung") });
      case "announcements/list": return json_({ ok: true, data: listAnnouncements_() });
      case "loan/status": return json_({ ok: true, data: publicLoanStatus_(params.loanId, params.token) });
      case "health": return json_({ ok: true, service: "LFX Core API", timestamp: new Date().toISOString() });
      default: return json_({ ok: false, error: "Unknown GET action." });
    }
  } catch (error) {
    return json_({ ok: false, error: errorMessage_(error) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    assertApiKey_(body.api_key);
    const action = clean_(body.action);
    switch (action) {
      case "session/me": return json_({ ok: true, data: sessionMe_(body) });
      case "assets/list": return json_({ ok: true, data: adminListAssets_(body) });
      case "loans/all": return json_({ ok: true, data: adminListLoans_(body) });
      case "ikes/all": return json_({ ok: true, data: adminListIkes_(body) });
      case "ikes/mine": return json_({ ok: true, data: userListIkes_(body) });
      case "ikes/repayment": return json_({ ok: true, data: withLock_(() => ikesRepayment_(body)) });
      case "loan/request": return json_({ ok: true, data: withLock_(() => requestLoan_(body)) });
      case "loan/approve": return json_({ ok: true, data: withLock_(() => decideLoan_(body)) });
      case "loan/scan": return json_({ ok: true, data: withLock_(() => scanLoan_(body)) });
      case "ikes/apply": return json_({ ok: true, data: withLock_(() => applyIkes_(body)) });
      case "ikes/approve": return json_({ ok: true, data: withLock_(() => decideIkes_(body)) });
      case "ikes/status": return json_({ ok: true, data: withLock_(() => updateIkesStatus_(body)) });
      case "tabung/record": return json_({ ok: true, data: withLock_(() => recordTabung_(body)) });
      case "announcements/saveAll": return json_({ ok: true, data: withLock_(() => saveAnnouncements_(body)) });
      case "organisation/saveAll": return json_({ ok: true, data: withLock_(() => saveOrganisationItems_(body)) });
      case "content/save": return json_({ ok: true, data: withLock_(() => saveSiteContent_(body)) });
      case "assets/save": return json_({ ok: true, data: withLock_(() => saveAssets_(body)) });
      case "file/upload": return json_({ ok: true, data: withLock_(() => uploadFile_(body)) });
      default: return json_({ ok: false, error: "Unknown POST action." });
    }
  } catch (error) {
    return json_({ ok: false, error: errorMessage_(error) });
  }
}

/** Run once from the Apps Script editor. */
function setupLFX() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Bind this Apps Script project to the LFX_Database spreadsheet first.");
  PropertiesService.getScriptProperties().setProperty("DATABASE_ID", spreadsheet.getId());

  Object.keys(TABLES).forEach((key) => ensureSheet_(`tbl_${key}`, TABLES[key]));

  const properties = PropertiesService.getScriptProperties();
  let folderId = properties.getProperty("DRIVE_FOLDER_ID");
  if (!folderId) {
    const folder = DriveApp.createFolder("LFX_Uploads");
    folderId = folder.getId();
    properties.setProperty("DRIVE_FOLDER_ID", folderId);
  }

  const initialAdmin = clean_(properties.getProperty("INITIAL_ADMIN_EMAIL")) || Session.getEffectiveUser().getEmail();
  if (initialAdmin) upsertUser_(initialAdmin, "Initial LFX Administrator", "ADMIN", true);

  if (!rows_("tbl_assets").length) {
    appendObject_("tbl_assets", {
      asset_id: "AST-001", name: "Pembesar Suara Mudah Alih", category: "Audio",
      image_url: "", status: "AVAILABLE", description: "Speaker berkuasa bateri untuk program pelajar."
    });
  }
  audit_(initialAdmin || "SYSTEM", "SYSTEM_SETUP", { spreadsheet_id: spreadsheet.getId(), folder_id: folderId });
  return { ok: true, databaseId: spreadsheet.getId(), folderId: folderId, initialAdmin: initialAdmin };
}

function sessionMe_(body) {
  const user = requireUser_(body.idToken, true);
  return { email: user.email, name: user.name, role: user.role };
}

function adminListAssets_(body) {
  requireAdmin_(body.idToken);
  return listAssets_(true);
}

function adminListLoans_(body) {
  requireAdmin_(body.idToken);
  const assets = indexBy_(rows_("tbl_assets"), "asset_id");
  const users = indexBy_(rows_("tbl_users"), "user_id");
  return rows_("tbl_loans").map((loan) => Object.assign({}, loan, {
    asset_name: assets[loan.asset_id] ? assets[loan.asset_id].name : loan.asset_id,
    user_name: users[loan.user_id] ? users[loan.user_id].full_name : loan.user_id
  })).sort((a, b) => String(b.request_date).localeCompare(String(a.request_date)));
}

function mapIkesRow_(item, users) {
  const reqAmt = Number(item.amount_requested || 0);
  const appAmt = item.amount_approved !== undefined && item.amount_approved !== "" ? Number(item.amount_approved) : undefined;
  const termDays = item.repayment_term_days !== undefined && item.repayment_term_days !== "" ? Number(item.repayment_term_days) : undefined;
  const repaid = item.amount_repaid !== undefined && item.amount_repaid !== "" ? Number(item.amount_repaid) : 0;

  let outstanding = undefined;
  if (appAmt !== undefined) {
    outstanding = Math.max(0, appAmt - repaid);
  }

  let isOverdue = false;
  if (item.status === "PAID" && item.repayment_due_date) {
    const todayStr = today_();
    if (todayStr > String(item.repayment_due_date) && (outstanding === undefined || outstanding > 0)) {
      isOverdue = true;
    }
  }

  const rawAccount = item.bank_account_number || "";
  let masked = "";
  if (rawAccount) {
    if (rawAccount.length > 4) {
      masked = "******" + rawAccount.slice(-4);
    } else {
      masked = "****";
    }
  }

  return Object.assign({}, item, {
    amount_requested: reqAmt,
    amount_approved: appAmt,
    repayment_term_days: termDays,
    amount_repaid: repaid,
    outstanding_amount: outstanding !== undefined ? outstanding : (item.outstanding_amount !== undefined && item.outstanding_amount !== "" ? Number(item.outstanding_amount) : undefined),
    is_overdue: isOverdue,
    user_name: users[item.user_id] ? users[item.user_id].full_name : item.user_id,
    bank_account_masked: masked
  });
}

function adminListIkes_(body) {
  requireAdmin_(body.idToken);
  const users = indexBy_(rows_("tbl_users"), "user_id");
  return rows_("tbl_ikes").map((item) => mapIkesRow_(item, users))
    .sort((a, b) => String(b.request_date).localeCompare(String(a.request_date)));
}

function userListIkes_(body) {
  const user = requireUser_(body.idToken, false);
  const users = indexBy_(rows_("tbl_users"), "user_id");
  return rows_("tbl_ikes")
    .filter((item) => String(item.user_id).toLowerCase() === user.email.toLowerCase())
    .map((item) => {
      const mapped = mapIkesRow_(item, users);
      delete mapped.bank_account_number;
      return mapped;
    })
    .sort((a, b) => String(b.request_date).localeCompare(String(a.request_date)));
}

function listAssets_(includeAll) {
  const values = rows_("tbl_assets").map((asset) => Object.assign({}, asset, { status: asset.status || "AVAILABLE" }));
  return includeAll ? values : values;
}

function requestLoan_(body) {
  const user = requireUser_(body.idToken, false);
  const assetId = required_(body.asset_id, "asset_id");
  const purpose = required_(body.purpose, "purpose");
  const borrowDate = required_(body.date_borrowed, "date_borrowed");
  const returnDate = required_(body.date_returned_expected, "date_returned_expected");
  if (new Date(returnDate) < new Date(borrowDate)) throw new Error("Expected return date cannot precede the borrow date.");
  const asset = findBy_("tbl_assets", "asset_id", assetId);
  if (!asset) throw new Error("Asset not found.");
  if (asset.status !== "AVAILABLE") throw new Error("This asset is currently unavailable.");

  const loan = {
    loan_id: makeId_("LON"), asset_id: assetId, user_id: user.email, purpose: purpose,
    request_date: new Date().toISOString(), approved_by: "", status: "PENDING", qr_code_url: "",
    date_borrowed: borrowDate, date_returned_expected: returnDate, date_returned_actual: ""
  };
  appendObject_("tbl_loans", loan);
  audit_(user.email, "LOAN_REQUESTED", loan);
  notifyAdmins_("New iAset request", `${user.name} requested ${asset.name} (${assetId}) from ${borrowDate} to ${returnDate}.`);
  return loan;
}

function decideLoan_(body) {
  const admin = requireAdmin_(body.idToken);
  const loanId = required_(body.loan_id, "loan_id");
  const decision = required_(body.decision, "decision").toUpperCase();
  if (["APPROVED", "REJECTED"].indexOf(decision) === -1) throw new Error("Decision must be APPROVED or REJECTED.");
  const loan = findBy_("tbl_loans", "loan_id", loanId);
  if (!loan) throw new Error("Loan not found.");
  if (loan.status !== "PENDING") throw new Error("Only pending requests can be decided.");

  if (decision === "APPROVED") assertNoLoanConflict_(loan);
  const patch = { status: decision, approved_by: admin.email, qr_code_url: decision === "APPROVED" ? signedLoanUrl_(loanId) : "" };
  updateBy_("tbl_loans", "loan_id", loanId, patch);
  audit_(admin.email, `LOAN_${decision}`, { loan_id: loanId, reason: clean_(body.reason) });

  const subject = decision === "APPROVED" ? "iAset request approved" : "iAset request rejected";
  const message = decision === "APPROVED"
    ? `Your iAset request ${loanId} has been approved. Digital pass: ${patch.qr_code_url}`
    : `Your iAset request ${loanId} has been rejected.${body.reason ? ` Reason: ${body.reason}` : ""}`;
  sendMailSafe_(loan.user_id, subject, message);
  return Object.assign({}, loan, patch);
}

function scanLoan_(body) {
  const admin = requireAdmin_(body.idToken);
  const payload = required_(body.qr_payload, "qr_payload");
  const parsed = parseLoanPayload_(payload);
  const loan = findBy_("tbl_loans", "loan_id", parsed.loanId);
  if (!loan) throw new Error("Loan not found.");
  if (parsed.token && !verifyLoanToken_(parsed.loanId, parsed.token)) throw new Error("Invalid QR signature.");

  if (loan.status === "APPROVED") {
    updateBy_("tbl_loans", "loan_id", loan.loan_id, { status: "ACTIVE", date_borrowed: loan.date_borrowed || today_() });
    updateBy_("tbl_assets", "asset_id", loan.asset_id, { status: "ON_LOAN" });
    audit_(admin.email, "LOAN_HANDED_OVER", { loan_id: loan.loan_id, asset_id: loan.asset_id });
    return { loan_id: loan.loan_id, status: "ACTIVE" };
  }
  if (loan.status === "ACTIVE") {
    updateBy_("tbl_loans", "loan_id", loan.loan_id, { status: "RETURNED", date_returned_actual: today_() });
    updateBy_("tbl_assets", "asset_id", loan.asset_id, { status: "AVAILABLE" });
    audit_(admin.email, "LOAN_RETURNED", { loan_id: loan.loan_id, asset_id: loan.asset_id });
    return { loan_id: loan.loan_id, status: "RETURNED" };
  }
  throw new Error(`Loan status ${loan.status} cannot be scanned.`);
}

function publicLoanStatus_(loanId, token) {
  loanId = clean_(loanId);
  token = clean_(token);
  if (!loanId || !token || !verifyLoanToken_(loanId, token)) throw new Error("Invalid or incomplete loan pass.");
  const loan = findBy_("tbl_loans", "loan_id", loanId);
  if (!loan) throw new Error("Loan not found.");
  const asset = findBy_("tbl_assets", "asset_id", loan.asset_id);
  const user = findBy_("tbl_users", "user_id", loan.user_id);
  return Object.assign({}, loan, { asset_name: asset ? asset.name : loan.asset_id, user_name: user ? user.full_name : maskEmail_(loan.user_id) });
}

function applyIkes_(body) {
  const user = requireUser_(body.idToken, false);
  const type = required_(body.type, "type").toUpperCase();
  const amount = Number(body.amount_requested);
  if (["CARE", "GO_HOME"].indexOf(type) === -1) throw new Error("Invalid iKES category.");
  if (type === "CARE" && [30, 50].indexOf(amount) === -1) throw new Error("iKES Care is limited to RM30 or RM50.");
  if (type === "GO_HOME" && (!(amount > 0) || amount > 100)) throw new Error("iKES Go-Home is limited to the actual ticket price, maximum RM100.");
  let ticketUrl = "";
  if (type === "GO_HOME") {
    if (!body.ticket_proof || !body.ticket_proof.data) throw new Error("Ticket proof is required for iKES Go-Home.");
    ticketUrl = saveDataUrl_(body.ticket_proof, `IKES_${user.email}_${Date.now()}`, false);
  }

  const intake = required_(body.intake, "intake");
  const className = required_(body.class_name, "class_name");
  const phoneNumber = required_(body.phone_number, "phone_number");
  const bankAccountNumber = required_(body.bank_account_number, "bank_account_number");
  const bankName = required_(body.bank_name, "bank_name");

  const application = {
    application_id: makeId_("IKES"), user_id: user.email, type: type, amount_requested: amount,
    ticket_proof_url: ticketUrl, status: "PENDING", request_date: new Date().toISOString(), approved_by: "", notes: clean_(body.notes),
    intake: intake, class_name: className, phone_number: phoneNumber, bank_account_number: bankAccountNumber, bank_name: bankName
  };
  appendObject_("tbl_ikes", application);
  audit_(user.email, "IKES_APPLIED", { application_id: application.application_id, type: type, amount: amount });
  notifyAdmins_("New iKES application", `${user.name} submitted ${type} for RM${amount.toFixed(2)}.`);
  return application;
}

function decideIkes_(body) {
  const admin = requireAdmin_(body.idToken);
  const id = required_(body.application_id, "application_id");
  const decision = required_(body.decision, "decision").toUpperCase();
  if (["APPROVED", "REJECTED"].indexOf(decision) === -1) throw new Error("Decision must be APPROVED or REJECTED.");
  const item = findBy_("tbl_ikes", "application_id", id);
  if (!item) throw new Error("iKES application not found.");
  if (item.status !== "PENDING") throw new Error("Only pending applications can be decided.");

  const reason = clean_(body.reason);
  if (decision === "REJECTED") {
    if (!reason) throw new Error("A reason is required when rejecting an application.");
  }

  const notes = reason ? `${item.notes || ""}${item.notes ? " | " : ""}Admin: ${reason}` : item.notes;

  const patch = {
    status: decision,
    approved_by: admin.email,
    notes: notes,
    decision_date: today_()
  };

  if (decision === "APPROVED") {
    const amountApproved = Number(body.amount_approved);
    if (isNaN(amountApproved) || amountApproved <= 0) {
      throw new Error("Approved amount must be a positive number.");
    }
    const repaymentTermDays = Number(body.repayment_term_days);
    if (isNaN(repaymentTermDays) || repaymentTermDays <= 0 || !Number.isInteger(repaymentTermDays)) {
      throw new Error("Repayment term days must be a positive integer.");
    }
    patch.amount_approved = amountApproved;
    patch.repayment_term_days = repaymentTermDays;
    patch.outstanding_amount = amountApproved;
    patch.amount_repaid = 0;
  } else if (decision === "REJECTED") {
    patch.rejection_reason = reason;
  }

  updateBy_("tbl_ikes", "application_id", id, patch);
  audit_(admin.email, `IKES_${decision}`, { application_id: id, reason: reason });
  sendMailSafe_(item.user_id, `iKES application ${decision.toLowerCase()}`, `Your application ${id} is ${decision}.${reason ? ` Reason: ${reason}` : ""}`);
  return { application_id: id, status: decision };
}

function updateIkesStatus_(body) {
  const admin = requireAdmin_(body.idToken);
  const id = required_(body.application_id, "application_id");
  const status = required_(body.status, "status").toUpperCase();
  if (["PAID", "REPAID"].indexOf(status) === -1) throw new Error("Status must be PAID or REPAID.");
  const item = findBy_("tbl_ikes", "application_id", id);
  if (!item) throw new Error("iKES application not found.");
  if (status === "PAID" && item.status !== "APPROVED") throw new Error("Only approved applications can be marked paid.");
  if (status === "REPAID" && item.status !== "PAID") throw new Error("Only paid applications can be marked repaid.");

  const patch = { status: status };

  if (status === "PAID") {
    const payDate = clean_(body.payment_date) || today_();
    patch.payment_date = payDate;

    const termDays = Number(item.repayment_term_days || 0);
    if (termDays > 0) {
      const pDate = new Date(payDate);
      pDate.setDate(pDate.getDate() + termDays);
      const dueStr = Utilities.formatDate(pDate, Session.getScriptTimeZone() || "Asia/Kuala_Lumpur", "yyyy-MM-dd");
      patch.repayment_due_date = dueStr;
    }

    patch.amount_repaid = Number(item.amount_repaid || 0);
    const approved = Number(item.amount_approved || 0);
    patch.outstanding_amount = Math.max(0, approved - patch.amount_repaid);
  } else if (status === "REPAID") {
    const approved = Number(item.amount_approved || 0);
    patch.amount_repaid = approved;
    patch.outstanding_amount = 0;
  }

  updateBy_("tbl_ikes", "application_id", id, patch);
  audit_(admin.email, `IKES_${status}`, { application_id: id });

  const finalItem = findBy_("tbl_ikes", "application_id", id);
  const users = indexBy_(rows_("tbl_users"), "user_id");
  const mapped = mapIkesRow_(finalItem, users);

  return {
    application_id: id,
    status: mapped.status,
    payment_date: mapped.payment_date,
    repayment_due_date: mapped.repayment_due_date,
    amount_approved: mapped.amount_approved,
    amount_repaid: mapped.amount_repaid,
    outstanding_amount: mapped.outstanding_amount,
    is_overdue: mapped.is_overdue
  };
}

function ikesRepayment_(body) {
  const admin = requireAdmin_(body.idToken);
  const id = required_(body.application_id, "application_id");
  const incrementalAmount = Number(body.amount);
  if (isNaN(incrementalAmount) || incrementalAmount <= 0) {
    throw new Error("Repayment amount must be a positive number.");
  }

  const item = findBy_("tbl_ikes", "application_id", id);
  if (!item) throw new Error("iKES application not found.");
  if (item.status !== "PAID") throw new Error("Repayment can only be recorded for PAID applications.");

  const currentRepaid = Number(item.amount_repaid || 0);
  const approved = Number(item.amount_approved || 0);
  const newRepaid = currentRepaid + incrementalAmount;
  const newOutstanding = Math.max(0, approved - newRepaid);

  const patch = {
    amount_repaid: newRepaid,
    outstanding_amount: newOutstanding
  };

  if (newOutstanding <= 0) {
    patch.status = "REPAID";
  }

  updateBy_("tbl_ikes", "application_id", id, patch);
  audit_(admin.email, "IKES_REPAYMENT", { application_id: id, amount: incrementalAmount, repayment_date: body.repayment_date });

  const finalItem = findBy_("tbl_ikes", "application_id", id);
  const users = indexBy_(rows_("tbl_users"), "user_id");
  return mapIkesRow_(finalItem, users);
}

function recordTabung_(body) {
  const admin = requireAdmin_(body.idToken);
  const type = required_(body.type, "type").toUpperCase();
  const amount = Number(body.amount);
  if (["COLLECTION", "DISTRIBUTION"].indexOf(type) === -1) throw new Error("Invalid fund record type.");
  if (!(amount > 0)) throw new Error("Amount must be greater than zero.");
  const record = {
    record_id: makeId_("TBG"), type: type, amount: amount, date: required_(body.date, "date"),
    description: required_(body.description, "description"), recorded_by: admin.email, recipient: clean_(body.recipient)
  };
  appendObject_("tbl_tabung", record);
  audit_(admin.email, `TABUNG_${type}`, record);
  return record;
}

function listAnnouncements_() {
  return rows_("tbl_announcements").map((item) => Object.assign({}, item, {
    title: parseLocalized_(item.title), content: parseLocalized_(item.content)
  })).sort((a, b) => String(b.publish_date).localeCompare(String(a.publish_date)));
}

function saveAnnouncements_(body) {
  const admin = requireAdmin_(body.idToken);
  const items = Array.isArray(body.announcements) ? body.announcements : [];
  const cleaned = items.map((item) => ({
    announcement_id: clean_(item.announcement_id) || makeId_("ANN"),
    title: JSON.stringify(item.title || { bm: "", en: "" }), content: JSON.stringify(item.content || { bm: "", en: "" }),
    category: clean_(item.category), attachment_url: clean_(item.attachment_url), publish_date: clean_(item.publish_date) || today_(),
    created_by: clean_(item.created_by) || admin.email, responsible_officer: clean_(item.responsible_officer)
  }));
  replaceRows_("tbl_announcements", cleaned);
  audit_(admin.email, "ANNOUNCEMENTS_SAVED", { count: cleaned.length });
  return { count: cleaned.length };
}

function getSiteContent_() {
  const item = findBy_("tbl_content", "content_key", "SITE_CONTENT");
  if (!item || !item.json_content) return null;
  try { return JSON.parse(item.json_content); } catch (error) { throw new Error("Stored website content is invalid JSON."); }
}

function saveSiteContent_(body) {
  const admin = requireAdmin_(body.idToken);
  if (!body.content || typeof body.content !== "object") throw new Error("content object is required.");
  const value = { content_key: "SITE_CONTENT", json_content: JSON.stringify(body.content), updated_at: new Date().toISOString(), updated_by: admin.email };
  upsertBy_("tbl_content", "content_key", "SITE_CONTENT", value);
  audit_(admin.email, "SITE_CONTENT_SAVED", { bytes: value.json_content.length });
  return { updated_at: value.updated_at };
}

function getOrganisationItems_() {
  const item = findBy_("tbl_content", "content_key", "ORGANISATION_ITEMS");
  if (!item || !item.json_content) {
    return [
      { id: "org-1", type: "LEADERSHIP", title: "Bendahari Agung Kehormat", code: "BAK", member_count: 1, sort_order: 1, is_active: true },
      { id: "org-2", type: "LEADERSHIP", title: "Naib Bendahari Agung Kehormat", code: "NBAK", member_count: 1, sort_order: 2, is_active: true },
      { id: "org-3", type: "UNIT", title: "Unit Perancangan & Kesatuan", code: "U-PERK", member_count: 1, sort_order: 3, is_active: true },
      { id: "org-4", type: "UNIT", title: "Unit Data & Operasi", code: "U-DOPE", member_count: 2, sort_order: 4, is_active: true },
      { id: "org-5", type: "UNIT", title: "Unit Aset & Inventori", code: "U-SAVE", member_count: 2, sort_order: 5, is_active: true }
    ];
  }
  try { return JSON.parse(item.json_content); } catch (error) { throw new Error("Stored organisation content is invalid JSON."); }
}

function saveOrganisationItems_(body) {
  const admin = requireAdmin_(body.idToken);
  const items = Array.isArray(body.items) ? body.items : [];
  const codes = {};
  items.forEach((item) => {
    if (!item.title) throw new Error("Title is required for all items.");
    const count = Number(item.member_count);
    if (isNaN(count) || count <= 0 || !Number.isInteger(count)) throw new Error("Member count must be a positive whole number.");
    const code = (item.code || "").trim();
    if (code) {
      if (codes[code]) throw new Error(`Duplicate non-empty code: ${code}`);
      codes[code] = true;
    }
  });

  const value = { content_key: "ORGANISATION_ITEMS", json_content: JSON.stringify(items), updated_at: new Date().toISOString(), updated_by: admin.email };
  upsertBy_("tbl_content", "content_key", "ORGANISATION_ITEMS", value);
  audit_(admin.email, "ORGANISATION_SAVED", { count: items.length });
  return { updated_at: value.updated_at };
}

function saveAssets_(body) {
  const admin = requireAdmin_(body.idToken);
  const items = Array.isArray(body.assets) ? body.assets : [];
  const seen = {};
  const cleaned = items.map((item) => {
    const id = required_(item.asset_id, "asset_id");
    if (seen[id]) throw new Error(`Duplicate asset_id: ${id}`);
    seen[id] = true;
    const status = required_(item.status, "status").toUpperCase();
    if (["AVAILABLE", "ON_LOAN", "DAMAGED", "MAINTENANCE"].indexOf(status) === -1) throw new Error(`Invalid asset status for ${id}.`);
    return { asset_id: id, name: required_(item.name, "name"), category: clean_(item.category), image_url: clean_(item.image_url), status: status, description: clean_(item.description) };
  });
  replaceRows_("tbl_assets", cleaned);
  audit_(admin.email, "ASSETS_SAVED", { count: cleaned.length });
  return { count: cleaned.length };
}

function uploadFile_(body) {
  const admin = requireAdmin_(body.idToken);
  if (!body.file || !body.file.data) throw new Error("file.data is required.");
  const url = saveDataUrl_(body.file, clean_(body.prefix) || "LFX_UPLOAD", true);
  audit_(admin.email, "FILE_UPLOADED", { url: url, name: body.file.name });
  return { url: url };
}

function requireUser_(idToken, adminOnly) {
  const identity = verifyGoogleToken_(idToken);
  let stored = findBy_("tbl_users", "user_id", identity.email);
  if (!stored) {
    const autoProvision = String(PropertiesService.getScriptProperties().getProperty("AUTO_PROVISION_USERS") || "true").toLowerCase() === "true";
    if (!autoProvision || adminOnly) throw new Error("Your account is not registered in LFX.");
    upsertUser_(identity.email, identity.name, "USER", true);
    audit_(identity.email, "USER_AUTO_PROVISIONED", { email: identity.email });
    stored = findBy_("tbl_users", "user_id", identity.email);
  }
  if (String(stored.is_active).toLowerCase() === "false" || stored.is_active === false) throw new Error("Your LFX account is inactive.");
  const role = String(stored.role || "USER").toUpperCase();
  if (adminOnly && role !== "ADMIN") throw new Error("Administrator access required.");
  return { email: identity.email, name: stored.full_name || identity.name, role: role };
}

function requireAdmin_(idToken) { return requireUser_(idToken, true); }

function verifyGoogleToken_(idToken) {
  idToken = required_(idToken, "idToken");
  if (idToken === "demo-token") throw new Error("Demo tokens are not accepted by the production API.");
  const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error("Google sign-in token is invalid or expired.");
  const payload = JSON.parse(response.getContentText());
  const clientId = clean_(PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID"));
  if (clientId && payload.aud !== clientId) throw new Error("Google token audience mismatch.");
  if (String(payload.email_verified) !== "true") throw new Error("Google email is not verified.");
  const allowedDomain = clean_(PropertiesService.getScriptProperties().getProperty("ALLOWED_EMAIL_DOMAIN")).toLowerCase();
  const email = clean_(payload.email).toLowerCase();
  if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) throw new Error("Please use an authorised campus Google account.");
  return { email: email, name: clean_(payload.name) || email, picture: clean_(payload.picture) };
}

function assertApiKey_(provided) {
  const expected = clean_(PropertiesService.getScriptProperties().getProperty("LFX_API_KEY"));
  if (!expected) throw new Error("LFX_API_KEY is not configured in Script properties.");
  if (clean_(provided) !== expected) throw new Error("Invalid API key.");
}

function assertNoLoanConflict_(loan) {
  const start = new Date(loan.date_borrowed).getTime();
  const end = new Date(loan.date_returned_expected).getTime();
  const conflict = rows_("tbl_loans").find((item) => item.loan_id !== loan.loan_id && item.asset_id === loan.asset_id && ["APPROVED", "ACTIVE"].indexOf(item.status) !== -1 && new Date(item.date_borrowed).getTime() <= end && new Date(item.date_returned_expected).getTime() >= start);
  if (conflict) throw new Error(`Asset has an overlapping approved booking (${conflict.loan_id}).`);
}

function signedLoanUrl_(loanId) {
  const siteUrl = clean_(PropertiesService.getScriptProperties().getProperty("SITE_URL")).replace(/\/$/, "");
  if (!siteUrl) throw new Error("SITE_URL is not configured in Script properties.");
  return `${siteUrl}/loan/verify?loanId=${encodeURIComponent(loanId)}&token=${encodeURIComponent(loanToken_(loanId))}`;
}

function loanToken_(loanId) {
  const secret = clean_(PropertiesService.getScriptProperties().getProperty("QR_SIGNING_SECRET")) || clean_(PropertiesService.getScriptProperties().getProperty("LFX_API_KEY"));
  const bytes = Utilities.computeHmacSha256Signature(loanId, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}

function verifyLoanToken_(loanId, token) { return loanToken_(loanId) === token; }

function parseLoanPayload_(payload) {
  const direct = payload.match(/^(LON-[A-Z0-9-]+)$/i);
  if (direct) return { loanId: direct[1], token: "" };
  const loanIdMatch = payload.match(/[?&]loanId=([^&]+)/i);
  const tokenMatch = payload.match(/[?&]token=([^&]+)/i);
  if (!loanIdMatch) throw new Error("QR payload does not contain a loan ID.");
  return { loanId: decodeURIComponent(loanIdMatch[1]), token: tokenMatch ? decodeURIComponent(tokenMatch[1]) : "" };
}

function saveDataUrl_(file, prefix, makePublic) {
  const raw = String(file.data || "");
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Uploaded file must be a base64 data URL.");
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 2.5 * 1024 * 1024) throw new Error("File is too large. Maximum 2.5 MB.");
  const safeName = `${prefix}_${String(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const blob = Utilities.newBlob(bytes, file.mimeType || match[1], safeName);
  const folderId = required_(PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID"), "DRIVE_FOLDER_ID Script property");
  const created = DriveApp.getFolderById(folderId).createFile(blob);
  if (makePublic) {
    try { created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (error) { /* Workspace policy may block public sharing */ }
    return `https://drive.google.com/uc?export=view&id=${created.getId()}`;
  }
  return `https://drive.google.com/file/d/${created.getId()}/view`;
}

function notifyAdmins_(subject, message) {
  const emails = rows_("tbl_users").filter((user) => String(user.role).toUpperCase() === "ADMIN" && String(user.is_active).toLowerCase() !== "false").map((user) => user.user_id).filter(Boolean);
  if (emails.length) sendMailSafe_(emails.join(","), `[LFX] ${subject}`, message);
}

function sendMailSafe_(to, subject, body) {
  try { if (to) MailApp.sendEmail(to, subject, body); } catch (error) { audit_("SYSTEM", "EMAIL_FAILED", { to: to, subject: subject, error: errorMessage_(error) }); }
}

function upsertUser_(email, name, role, active) {
  upsertBy_("tbl_users", "user_id", email.toLowerCase(), { user_id: email.toLowerCase(), full_name: name, role: role, is_active: active });
}

function audit_(userId, action, details) {
  appendObject_("tbl_audit", { timestamp: new Date().toISOString(), user_id: userId || "SYSTEM", action: action, details: JSON.stringify(details || {}) });
}

function spreadsheet_() {
  const id = required_(PropertiesService.getScriptProperties().getProperty("DATABASE_ID"), "DATABASE_ID Script property");
  return SpreadsheetApp.openById(id);
}

function ensureSheet_(name, headers) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    headers.forEach((header, index) => { if (current[index] !== header) sheet.getRange(1, index + 1).setValue(header); });
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0d4d41").setFontColor("#ffffff");
  return sheet;
}

function sheet_(name) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error(`Missing sheet: ${name}. Run setupLFX().`);
  return sheet;
}

function rows_(name) {
  const sheet = sheet_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter((row) => row.some((value) => value !== "")).map((row) => {
    const object = {};
    headers.forEach((header, index) => { object[header] = normaliseCell_(row[index]); });
    return object;
  });
}

function appendObject_(name, object) {
  const sheet = sheet_(name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map((header) => valueForCell_(object[header])));
}

function replaceRows_(name, objects) {
  const sheet = sheet_(name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  if (objects.length) sheet.getRange(2, 1, objects.length, headers.length).setValues(objects.map((object) => headers.map((header) => valueForCell_(object[header]))));
}

function findBy_(name, key, value) { return rows_(name).find((item) => String(item[key]) === String(value)) || null; }

function updateBy_(name, key, value, patch) {
  const sheet = sheet_(name);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const keyIndex = headers.indexOf(key);
  if (keyIndex < 0) throw new Error(`Column ${key} not found in ${name}.`);
  for (let row = 1; row < data.length; row++) {
    if (String(normaliseCell_(data[row][keyIndex])) === String(value)) {
      Object.keys(patch).forEach((field) => {
        const column = headers.indexOf(field);
        if (column >= 0) sheet.getRange(row + 1, column + 1).setValue(valueForCell_(patch[field]));
      });
      return;
    }
  }
  throw new Error(`${value} not found in ${name}.`);
}

function upsertBy_(name, key, value, object) {
  const existing = findBy_(name, key, value);
  if (existing) updateBy_(name, key, value, object); else appendObject_(name, object);
}

function indexBy_(items, key) { return items.reduce((map, item) => { map[item[key]] = item; return map; }, {}); }

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Request body is empty.");
  try { return JSON.parse(e.postData.contents); } catch (error) { throw new Error("Request body must be valid JSON."); }
}

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function clean_(value) { return value === null || value === undefined ? "" : String(value).trim(); }
function required_(value, label) { const result = clean_(value); if (!result) throw new Error(`${label} is required.`); return result; }
function makeId_(prefix) { return `${prefix}-${Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kuala_Lumpur", "yyMMddHHmmss")}-${Math.floor(100 + Math.random() * 900)}`; }
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kuala_Lumpur", "yyyy-MM-dd"); }
function errorMessage_(error) { return error && error.message ? error.message : String(error); }
function parseLocalized_(value) { if (value && typeof value === "object") return value; try { return JSON.parse(value); } catch (error) { return { bm: clean_(value), en: clean_(value) }; } }
function maskEmail_(email) { const parts = clean_(email).split("@"); return parts.length === 2 ? `${parts[0].slice(0,2)}***@${parts[1]}` : "Verified borrower"; }
function normaliseCell_(value) { return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone() || "Asia/Kuala_Lumpur", "yyyy-MM-dd") : value; }
function valueForCell_(value) { return value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : value; }
