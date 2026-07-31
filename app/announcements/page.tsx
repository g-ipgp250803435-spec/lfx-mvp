"use client";
import { AnnouncementList } from "@/components/AnnouncementList";
import { PageHero } from "@/components/PageHero";

export default function AnnouncementsPage() {
  return <><PageHero eyebrow={{bm:"Arkib rasmi perbendaharaan",en:"Official treasury archive"}} title={{bm:"Pusat Pengumuman",en:"Announcement Centre"}} description={{bm:"Makluman elaun, tuntutan, korporat, iAset, iKES dan urusan kewangan MPP.",en:"Notices on allowances, claims, corporate matters, iAset, iKES and SRC financial affairs."}}/><section className="section"><div className="container container--narrow"><AnnouncementList/></div></section></>;
}
