"use client";
import Link from "next/link";
import { AssetBrowser } from "@/components/AssetBrowser";
import { PageHero } from "@/components/PageHero";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";

export default function IAsetPage() {
  const { language } = useApp();
  return <><PageHero eyebrow={{bm:"Pengurusan aset secara digital",en:"Digital asset management"}} title={{bm:"iAset",en:"iAset"}} description={{bm:"Semak status aset secara terbuka. Log masuk untuk mengemukakan permohonan pinjaman.",en:"Check asset status publicly. Sign in to submit a loan request."}} actions={<Link href="/iaset/apply" className="button button--accent">{language === "bm" ? "Mohon aset" : "Request an asset"}<Icon name="arrow" size={17}/></Link>}/><section className="section"><div className="container"><AssetBrowser/></div></section></>;
}
