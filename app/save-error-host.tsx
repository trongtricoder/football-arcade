"use client";

import { useEffect, useState } from "react";

type SaveFailure={message:string;retry:()=>void};
export function SaveErrorHost(){const [failure,setFailure]=useState<SaveFailure|null>(null);useEffect(()=>{const show=(event:Event)=>setFailure((event as CustomEvent<SaveFailure>).detail);window.addEventListener("football-save-error",show);return()=>window.removeEventListener("football-save-error",show)},[]);if(!failure)return null;return <aside className="save-error-toast" role="alert"><div><b>RESULT NOT SAVED</b><span>{failure.message}</span></div><button onClick={()=>{failure.retry();setFailure(null)}}>RETRY SAVE</button><button aria-label="Dismiss" onClick={()=>setFailure(null)}>×</button></aside>}
