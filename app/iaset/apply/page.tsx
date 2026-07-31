"use client";
import { Suspense } from "react";
import { LoanForm } from "@/components/LoanForm";
import { PageHero } from "@/components/PageHero";

export default function LoanApplicationPage() {
  return <><PageHero eyebrow={{bm:"Permohonan digital",en:"Digital application"}} title={{bm:"Mohon pinjaman aset",en:"Request an asset loan"}} description={{bm:"Pilih aset dan tempoh penggunaan. Permohonan akan disemak oleh BAK atau NBAK.",en:"Select the asset and usage period. Your request will be reviewed by the Treasury team."}}/><section className="section section--soft"><div className="container container--narrow"><Suspense fallback={<div className="empty-state">Loading…</div>}><LoanForm/></Suspense></div></section></>;
}
