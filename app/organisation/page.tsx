"use client";
import { OrgChart } from "@/components/OrgChart";
import { PageHero } from "@/components/PageHero";

export default function OrganisationPage() {
  return <><PageHero eyebrow={{bm:"Akauntabiliti bermula dengan manusia",en:"Accountability starts with people"}} title={{bm:"Organisasi Pejabat Bendahari Agung",en:"Office of the Treasurer-General"}} description={{bm:"Kenali pegawai, portfolio dan tanggungjawab rasmi pasukan perbendaharaan MPP.",en:"Meet the officers, portfolios and official responsibilities of the SRC Treasury team."}}/><section className="section section--soft"><div className="container"><OrgChart/></div></section></>;
}
