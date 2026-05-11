"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function CredentialsSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in…");
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl: "/dashboard" });
    if (res?.ok) {
      setStatus("Redirecting…");
      window.location.href = "/dashboard";
    } else {
      setStatus(res?.error || "Sign-in failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
      />

      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/35 hover:bg-indigo-400"
      >
        Continue
      </button>

      {status ? <div className="text-sm text-white/80">{status}</div> : null}
    </form>
  );
}
