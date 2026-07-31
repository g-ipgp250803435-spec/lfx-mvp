"use client";

import { useState } from "react";
import { CmsImage } from "@/components/CmsImage";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";
import type { Officer } from "@/lib/types";

export function OrgChart() {
  const { content } = useContent();
  const { language } = useApp();
  const [selected, setSelected] = useState<Officer | null>(null);
  const levels = Array.from(new Set(content.organisation.map((item) => item.level))).sort();
  return <>
    <div className="org-chart">{levels.map((level, index) => <div className="org-level" key={level}>{index > 0 && <span className="org-connector"/>}{content.organisation.filter((item) => item.level === level).map((officer) => <button key={officer.id} className="officer-card" onClick={() => setSelected(officer)}><CmsImage src={officer.photoUrl || "/officer-placeholder.svg"} alt={officer.name} width={116} height={116}/><span>{t(officer.position, language)}</span><strong>{officer.name}</strong><small>{t(officer.portfolio, language)}</small></button>)}</div>)}</div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="officer-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}><Icon name="close"/></button><CmsImage src={selected.photoUrl || "/officer-placeholder.svg"} alt={selected.name} width={140} height={140}/><span className="eyebrow">{t(selected.position, language)}</span><h2>{selected.name}</h2><p className="officer-modal__portfolio">{t(selected.portfolio, language)}</p><p>{t(selected.responsibilities, language)}</p><a href={`mailto:${selected.email}`} className="button button--outline"><Icon name="mail" size={17}/>{selected.email}</a></section></div>}
  </>;
}
