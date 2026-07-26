"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallback() {
  const [message, setMessage] = useState(() => typeof window !== "undefined" && !new URLSearchParams(window.location.search).get("code") ? "THE SIGN-IN LINK IS INVALID OR HAS EXPIRED." : "SECURING YOUR FOOTBALL ARCADE ID...");

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const code = parameters.get("code");
    const next = parameters.get("next")?.startsWith("/") ? parameters.get("next")! : "/profile";
    if (!code) return;
    createSupabaseBrowserClient().auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setMessage(error.message.toUpperCase());
      else window.location.replace(next);
    });
  }, []);

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:30,background:"#07110c",color:"#c8ff3d",fontFamily:"Arial,sans-serif",fontWeight:900,letterSpacing:2,textAlign:"center"}}>{message}</main>;
}
