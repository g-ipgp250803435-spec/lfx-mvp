export type LocalizedText = { bm: string; en: string };
export type Language = "bm" | "en";

export type MenuItem = {
  id: string;
  label: LocalizedText;
  href: string;
  enabled: boolean;
};

export type FeatureItem = {
  id: string;
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  href: string;
};

export type CustomPageSection = {
  id: string;
  heading: LocalizedText;
  body: LocalizedText;
  imageUrl?: string;
  buttonLabel?: LocalizedText;
  buttonHref?: string;
};

export type CustomPage = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  heroImage?: string;
  published: boolean;
  sections: CustomPageSection[];
};

export type Officer = {
  id: string;
  name: string;
  position: LocalizedText;
  portfolio: LocalizedText;
  email: string;
  responsibilities: LocalizedText;
  photoUrl: string;
  level: number;
};

export type SiteContent = {
  site: {
    name: string;
    shortName: string;
    tagline: LocalizedText;
    description: LocalizedText;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    accentColor: string;
    officialEmail: string;
  };
  hero: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    primaryButton: { label: LocalizedText; href: string };
    secondaryButton: { label: LocalizedText; href: string };
  };
  notice: {
    enabled: boolean;
    label: LocalizedText;
    text: LocalizedText;
    href: string;
  };
  navigation: MenuItem[];
  features: FeatureItem[];
  donation: {
    heading: LocalizedText;
    description: LocalizedText;
    target: number;
    paymentUrl: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    qrImageUrl: string;
    note: LocalizedText;
  };
  footer: {
    about: LocalizedText;
    address: string;
    links: MenuItem[];
    copyright: LocalizedText;
  };
  organisation: Officer[];
  customPages: CustomPage[];
};

export type AssetStatus = "AVAILABLE" | "ON_LOAN" | "DAMAGED" | "MAINTENANCE";
export type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "RETURNED";
export type IkesStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "REPAID";

export type Asset = {
  asset_id: string;
  name: string;
  category: string;
  image_url: string;
  status: AssetStatus;
  description: string;
};

export type Loan = {
  loan_id: string;
  asset_id: string;
  asset_name?: string;
  user_id: string;
  user_name?: string;
  purpose: string;
  request_date: string;
  approved_by: string;
  status: LoanStatus;
  qr_code_url: string;
  date_borrowed: string;
  date_returned_expected: string;
  date_returned_actual: string;
};

export type IkesApplication = {
  application_id: string;
  user_id: string;
  user_name?: string;
  type: "CARE" | "GO_HOME";
  amount_requested: number;
  ticket_proof_url: string;
  status: IkesStatus;
  request_date: string;
  approved_by: string;
  notes: string;
};

export type TabungRecord = {
  record_id: string;
  type: "COLLECTION" | "DISTRIBUTION";
  amount: number;
  date: string;
  description: string;
  recorded_by: string;
  recipient?: string;
};

export type Announcement = {
  announcement_id: string;
  title: LocalizedText;
  content: LocalizedText;
  category: string;
  attachment_url: string;
  publish_date: string;
  created_by: string;
  responsible_officer?: string;
};

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  demo?: boolean;
};
