"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

type Preview = { src:string; filename:string; title:string };

export function ShareCardHost(){
  const [preview,setPreview]=useState<Preview|null>(null);
  useEffect(()=>{const open=(event:Event)=>setPreview((event as CustomEvent<Preview>).detail);window.addEventListener("football-share-card",open);return()=>window.removeEventListener("football-share-card",open)},[]);
  useEffect(()=>{if(!preview)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setPreview(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[preview]);
  if(!preview)return null;
  return <div className="share-card-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null)}}><section className="share-card-dialog" role="dialog" aria-modal="true" aria-label="Share card preview"><header><div><span>SHARE CARD READY</span><h2>{preview.title}</h2><p>Preview the complete card, then save the full-resolution PNG.</p></div><button onClick={()=>setPreview(null)}>CLOSE ×</button></header><div className="share-card-stage"><img src={preview.src} alt={`${preview.title} share card preview`}/></div><footer><a href={preview.src} download={preview.filename}>DOWNLOAD PNG ↓</a><button onClick={()=>setPreview(null)}>BACK TO ARCADE</button></footer></section></div>;
}
