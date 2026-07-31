"use client";
import { PageHero } from "@/components/PageHero";
import { TabungDashboard } from "@/components/TabungDashboard";

export default function TabungPage() {
  return <><PageHero eyebrow={{bm:"Kutipan dan agihan terbuka",en:"Open collection and distribution"}} title={{bm:"Digital Tabung Jumaat",en:"Digital Friday Fund"}} description={{bm:"Ikuti kutipan mingguan, agihan kebajikan dan baki dana melalui papan pemuka ketelusan awam.",en:"Follow weekly collections, welfare distributions and fund balances through the public transparency dashboard."}}/><section className="section section--soft"><div className="container"><TabungDashboard/></div></section></>;
}
