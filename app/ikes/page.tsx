"use client";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";

export default function IkesPage() {
  const { language } = useApp();
  return <><PageHero eyebrow={{bm:"Pinjaman kebajikan tanpa faedah",en:"Interest-free welfare loan"}} title={{bm:"iKES",en:"iKES"}} description={{bm:"Sokongan jangka pendek yang direkodkan dengan telus untuk membantu pelajar menghadapi keperluan mendesak.",en:"Transparent short-term support for students facing urgent needs."}} actions={<Link href="/ikes/apply" className="button button--accent">{language === "bm" ? "Mulakan permohonan" : "Start application"}<Icon name="arrow" size={17}/></Link>}/><section className="section"><div className="container"><div className="ikes-options"><article><span><Icon name="heart"/></span><h2>iKES Care</h2><strong>RM30 / RM50</strong><p>{language === "bm" ? "Kegunaan umum bagi keperluan kebajikan sementara." : "General-purpose temporary welfare assistance."}</p></article><article><span><Icon name="briefcase"/></span><h2>iKES Go-Home</h2><strong>{language === "bm" ? "Harga sebenar · maks. RM100" : "Actual cost · max. RM100"}</strong><p>{language === "bm" ? "Bantuan tambang pulang dengan bukti harga tiket." : "Travel assistance supported by ticket-price proof."}</p></article></div><div className="policy-notice policy-notice--large"><Icon name="clock"/><span>{language === "bm" ? "Bayaran balik penuh mesti dibuat dalam tempoh 3 hari selepas elaun sara hidup dikreditkan." : "Full repayment must be made within 3 days after the subsistence allowance is credited."}</span></div></div></section></>;
}
