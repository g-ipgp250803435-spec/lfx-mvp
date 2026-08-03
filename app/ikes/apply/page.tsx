"use client";
import { IkesForm } from "@/components/IkesForm";
import { PageHero } from "@/components/PageHero";

export default function IkesApplicationPage() {
  return <><PageHero eyebrow={{bm:"iKES digital",en:"Digital iKES"}} title={{bm:"Permohonan pinjaman",en:"Loan application"}} description={{bm:"Maklumat anda hanya digunakan untuk tujuan semakan dan rekod rasmi.",en:"Your information is used solely for review and official records."}}/><section className="section section--soft"><div className="container container--narrow"><IkesForm/></div></section></>;
}
