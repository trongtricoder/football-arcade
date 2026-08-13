"use client";

import {useEffect,useId,useRef} from "react";
import releaseData from "@/data/whats-new.v1.json";
import {sortReleasesNewestFirst,type ChangeCategory,type WhatsNewRelease} from "@/lib/whats-new";
import "./whats-new-modal.css";

const CATEGORY_ORDER:ChangeCategory[]=["New","Improved","Fixed","Data"];
export const whatsNewReleases=sortReleasesNewestFirst(releaseData.releases as WhatsNewRelease[]);
export const latestWhatsNewVersion=whatsNewReleases[0]?.version??"";

export function WhatsNewModal({onClose}:{onClose:()=>void}){
  const titleId=useId(),dialogRef=useRef<HTMLElement>(null),previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();onClose();return}
      if(event.key!=="Tab")return;
      const focusable=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')??[]).filter(element=>!element.hasAttribute("disabled"));
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener("keydown",onKeyDown);
    return()=>{document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;previousFocus.current?.focus()};
  },[onClose]);
  return <div className="whats-new-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section ref={dialogRef} className="whats-new-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header><div><span>FOOTBALL ARCADE · EARLY ACCESS</span><h2 id={titleId}>WHAT’S NEW</h2><p>The player-facing highlights. Short, useful, and straight from the touchline.</p></div><button type="button" className="whats-new-close" onClick={onClose} aria-label="Close What’s New">×</button></header>
      <div className="whats-new-feed">{whatsNewReleases.map((release,index)=><article className="release-card" key={release.version} aria-label={`${release.title}, version ${release.version}`}>
        <div className="release-meta"><time dateTime={release.releaseDate}>{new Intl.DateTimeFormat("en",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${release.releaseDate}T00:00:00Z`))}</time><b>V{release.version}</b>{release.label&&<em>{release.label}</em>}</div>
        <div className="release-copy"><span>{String(index+1).padStart(2,"0")}</span><div><h3>{release.title}</h3><p>{release.summary}</p></div></div>
        <div className="release-changes">{CATEGORY_ORDER.map(category=>release.changes[category]?.length?<section key={category}><h4>{category}</h4><ul>{release.changes[category]?.map(change=><li key={change}>{change}</li>)}</ul></section>:null)}</div>
      </article>)}</div>
    </section>
  </div>;
}
