import type { Announcement, Asset, IkesApplication, Loan, TabungRecord } from "@/lib/types";

export const mockAssets: Asset[] = [
  { asset_id: "AST-001", name: "Pembesar Suara Mudah Alih", category: "Audio", image_url: "/asset-speaker.svg", status: "AVAILABLE", description: "Speaker berkuasa bateri untuk program pelajar." },
  { asset_id: "AST-002", name: "Projektor HD", category: "Visual", image_url: "/asset-projector.svg", status: "ON_LOAN", description: "Projektor mudah alih dengan kabel HDMI." },
  { asset_id: "AST-003", name: "Kanopi 10 × 10", category: "Acara", image_url: "/asset-canopy.svg", status: "AVAILABLE", description: "Kanopi lipat untuk aktiviti luar." },
  { asset_id: "AST-004", name: "Kamera DSLR", category: "Media", image_url: "/asset-camera.svg", status: "MAINTENANCE", description: "Kamera dokumentasi rasmi MPP." }
];

export const mockLoans: Loan[] = [
  { loan_id: "LON-24001", asset_id: "AST-002", asset_name: "Projektor HD", user_id: "pelajar@ipg.edu.my", user_name: "Aina Rahman", purpose: "Pembentangan program akademik", request_date: "2026-07-29T09:30:00Z", approved_by: "treasurer@ipg.edu.my", status: "ACTIVE", qr_code_url: "/loan/verify?loanId=LON-24001&token=demo", date_borrowed: "2026-07-30", date_returned_expected: "2026-08-01", date_returned_actual: "" },
  { loan_id: "LON-24002", asset_id: "AST-003", asset_name: "Kanopi 10 × 10", user_id: "faris@ipg.edu.my", user_name: "Faris Hakim", purpose: "Hari Kokurikulum", request_date: "2026-07-31T02:00:00Z", approved_by: "", status: "PENDING", qr_code_url: "", date_borrowed: "", date_returned_expected: "2026-08-03", date_returned_actual: "" }
];

export const mockIkes: IkesApplication[] = [
  { application_id: "IKES-31001", user_id: "sarah@ipg.edu.my", user_name: "Sarah Imani", type: "CARE", amount_requested: 50, ticket_proof_url: "", status: "PENDING", request_date: "2026-07-31T01:15:00Z", approved_by: "", notes: "Keperluan harian sementara menunggu elaun." },
  { application_id: "IKES-31002", user_id: "demo.user@ipg.edu.my", user_name: "Pengguna Demo", type: "GO_HOME", amount_requested: 86, ticket_proof_url: "https://example.com/ticket-proof", status: "PAID", request_date: "2026-07-24T10:00:00Z", approved_by: "treasurer@ipg.edu.my", notes: "Tiket bas pulang ke kampung.", amount_approved: 86, repayment_term_days: 3, decision_date: "2026-07-25", payment_date: "2026-07-26", repayment_due_date: "2026-07-29", amount_repaid: 30, outstanding_amount: 56, is_overdue: true },
  { application_id: "IKES-31003", user_id: "demo.user@ipg.edu.my", user_name: "Pengguna Demo", type: "CARE", amount_requested: 50, ticket_proof_url: "", status: "APPROVED", request_date: "2026-07-28T09:00:00Z", approved_by: "treasurer@ipg.edu.my", notes: "Kecemasan perubatan ringan.", amount_approved: 50, repayment_term_days: 7, decision_date: "2026-07-29" },
  { application_id: "IKES-31004", user_id: "demo.user@ipg.edu.my", user_name: "Pengguna Demo", type: "CARE", amount_requested: 30, ticket_proof_url: "", status: "REJECTED", request_date: "2026-07-20T08:00:00Z", approved_by: "treasurer@ipg.edu.my", notes: "Membeli buku rujukan.", rejection_reason: "iKES terhad kepada kebajikan mendesak & tambang pulang sahaja." }
];

export const mockTabung: TabungRecord[] = [
  { record_id: "TBG-001", type: "COLLECTION", amount: 286.5, date: "2026-07-31", description: "Kutipan minggu kelima Julai", recorded_by: "treasurer@ipg.edu.my" },
  { record_id: "TBG-002", type: "COLLECTION", amount: 412, date: "2026-07-24", description: "Kutipan minggu keempat Julai", recorded_by: "treasurer@ipg.edu.my" },
  { record_id: "TBG-003", type: "DISTRIBUTION", amount: 150, date: "2026-07-25", description: "Bantuan kecemasan pelajar", recorded_by: "treasurer@ipg.edu.my", recipient: "Penerima dirahsiakan" },
  { record_id: "TBG-004", type: "COLLECTION", amount: 368.2, date: "2026-07-17", description: "Kutipan minggu ketiga Julai", recorded_by: "treasurer@ipg.edu.my" }
];

export const mockAnnouncements: Announcement[] = [
  { announcement_id: "ANN-001", title: { bm: "Permohonan iKES bagi bulan Ogos dibuka", en: "August iKES applications are open" }, content: { bm: "Pelajar yang memerlukan bantuan sementara boleh mengemukakan permohonan melalui portal HiPER.", en: "Students requiring temporary assistance may submit an application through the HiPER portal." }, category: "iKES", attachment_url: "", publish_date: "2026-07-30", created_by: "treasurer@ipg.edu.my", responsible_officer: "Naib Bendahari Agung" },
  { announcement_id: "ANN-002", title: { bm: "Jadual pemulangan aset minggu ini", en: "This week's asset return schedule" }, content: { bm: "Semua peminjam diminta memastikan aset dipulangkan mengikut tarikh yang diluluskan.", en: "All borrowers are requested to return assets by the approved date." }, category: "iAset", attachment_url: "", publish_date: "2026-07-28", created_by: "treasurer@ipg.edu.my", responsible_officer: "Bendahari Agung" },
  { announcement_id: "ANN-003", title: { bm: "Laporan ringkas Tabung Jumaat Julai", en: "July Friday Fund summary" }, content: { bm: "Ringkasan kutipan dan agihan bulan Julai kini boleh dilihat pada papan pemuka ketelusan.", en: "The July collection and distribution summary is now available on the transparency dashboard." }, category: "Tabung Jumaat", attachment_url: "", publish_date: "2026-07-26", created_by: "treasurer@ipg.edu.my", responsible_officer: "Bendahari Agung" }
];
