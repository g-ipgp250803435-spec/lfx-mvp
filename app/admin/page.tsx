import type { Metadata } from "next";
import { AdminStudio } from "@/components/AdminStudio";

export const metadata: Metadata = { title: "HiPER Admin", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminStudio/>; }
