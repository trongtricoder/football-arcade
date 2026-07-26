"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountState = "loading" | "signed-out" | "anonymous" | "registered";

export function AccountCenter() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AccountState>("loading");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Checking your account...");
  const hasGoogleIdentity = user?.identities?.some((identity) => identity.provider === "google") ?? false;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user);
      const nextState = !data.user
        ? "signed-out"
        : data.user.is_anonymous
          ? "anonymous"
          : "registered";
      setState(nextState);
      setMessage(
        nextState === "anonymous"
          ? "Your Era XI progress is stored on this browser. Secure it to use it on every device."
          : nextState === "registered"
            ? "Your Football Arcade identity is secured."
            : "Sign in or keep playing without an account.",
      );
    });
  }, []);

  async function google() {
    const supabase = createSupabaseBrowserClient();
    setMessage("Opening Google...");
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { error } = state === "signed-out"
      ? await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
      : await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } });
    if (error) setMessage(error.message);
  }

  async function emailAccess(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    const supabase = createSupabaseBrowserClient();
    setMessage("Sending your secure email link...");
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { error } = state === "anonymous"
      ? await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: redirectTo })
      : await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setMessage(
      error
        ? error.message
        : state === "anonymous"
          ? "Check your email to attach it to this anonymous player."
          : "Check your email for the Football Arcade sign-in link.",
    );
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    setUser(null);
    setState("signed-out");
    setMessage("Signed out safely.");
  }

  return (
    <main className="account-page">
      <Link className="account-back" href="/">← BACK TO ARCADE</Link>
      <section className="account-hero">
        <span>FOOTBALL ARCADE ID</span>
        <h1>{state === "registered" ? "WELCOME BACK." : "SAVE YOUR LEGACY."}</h1>
        <p>{message}</p>
      </section>

      <section className="account-panel">
        <div className="account-status">
          <small>CURRENT STATUS</small>
          <strong>
            {state === "loading" ? "CHECKING" : state === "registered" ? "REGISTERED PLAYER" : state === "anonymous" ? "ANONYMOUS PLAYER" : "SIGNED OUT"}
          </strong>
          {user && <span>PLAYER ID · {user.id.slice(0, 8).toUpperCase()}</span>}
        </div>

        {state !== "registered" ? (
          <div className="account-methods">
            <button type="button" onClick={google}>CONTINUE WITH GOOGLE ↗</button>
            <form onSubmit={emailAccess}>
              <label htmlFor="account-email">EMAIL MAGIC LINK</label>
              <div>
                <input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
                <button type="submit">SEND LINK ↗</button>
              </div>
            </form>
            {state === "anonymous" && <p>Securing this account keeps your existing verified runs and achievements.</p>}
          </div>
        ) : (
          <div className="account-methods registered">
            <small>SIGNED IN AS</small>
            <strong>{user?.email || user?.user_metadata?.full_name || "Football Arcade Player"}</strong>
            <a href="/profile">OPEN PLAYER PROFILE ↗</a>
            {hasGoogleIdentity ? (
              <p>GOOGLE ACCOUNT LINKED ✓</p>
            ) : (
              <button type="button" onClick={google}>LINK GOOGLE ACCOUNT ↗</button>
            )}
            <button type="button" onClick={signOut}>SIGN OUT</button>
          </div>
        )}
      </section>
    </main>
  );
}
