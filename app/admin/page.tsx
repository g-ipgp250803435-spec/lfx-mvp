import type { Metadata } from "next";
import { AdminStudio } from "@/components/AdminStudio";

export const metadata: Metadata = { title: "LFX Admin", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminStudio/>; }
