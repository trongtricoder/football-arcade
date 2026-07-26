import Link from "next/link";

export const metadata={title:"Football Arcade account",robots:{index:false,follow:false}};

export default async function AuthCompletePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams,status=params.status==="success"?"success":"error",next=typeof params.next==="string"&&params.next.startsWith("/")?params.next:"/",reason=typeof params.reason==="string"?params.reason:"The confirmation link could not be completed.";
  return <main className={`auth-complete ${status}`}><section><span>FOOTBALL ARCADE ID</span><div className="auth-complete-mark">{status==="success"?"✓":"!"}</div><h1>{status==="success"?"YOU'RE ALL SET.":"SIGN-IN NEEDS ANOTHER TRY."}</h1><p>{status==="success"?"Your email is confirmed and your Football Arcade legacy is secured.":reason}</p><Link href={status==="success"?`${next}${next.includes("?")?"&":"?"}auth=success`:"/?account=signin"}>{status==="success"?"RETURN TO FOOTBALL ARCADE ↗":"RETURN AND TRY AGAIN ↗"}</Link></section></main>;
}
