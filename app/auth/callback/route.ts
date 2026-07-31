import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

function safeNext(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")?value:"/";}

export async function GET(request:NextRequest){
  const requestUrl=new URL(request.url),code=requestUrl.searchParams.get("code"),flow=requestUrl.searchParams.get("flow"),next=safeNext(requestUrl.searchParams.get("next"));
  if(!code){
    return NextResponse.redirect(new URL(`/auth/complete?status=error&reason=${encodeURIComponent("The sign-in link is invalid or has expired.")}`,requestUrl.origin));
  }
  try{
    const cookieStore=await cookies(),{url,publishableKey}=getSupabasePublicConfig();
    const supabase=createServerClient(url,publishableKey,{cookies:{
      getAll:()=>cookieStore.getAll(),
      setAll:values=>values.forEach(({name,value,options})=>cookieStore.set(name,value,options)),
    }});
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)throw error;
    if(flow==="google"){
      const destination=new URL(next,requestUrl.origin);destination.searchParams.set("auth","success");
      return NextResponse.redirect(destination);
    }
    return NextResponse.redirect(new URL(`/auth/complete?status=success&next=${encodeURIComponent(next)}`,requestUrl.origin));
  }catch(error){
    console.error("Authentication callback failed",error);
    const reason="The sign-in link could not be completed. It may have expired or already been used.";
    return NextResponse.redirect(new URL(`/auth/complete?status=error&reason=${encodeURIComponent(reason)}`,requestUrl.origin));
  }
}
