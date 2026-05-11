"use client";

import Link from "next/link";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [classId, setClassId] = useState("class-a");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Creating account…");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, classId: role === "student" ? classId : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "Signup failed");
      return;
    }

    const signRes = await signIn("credentials", { redirect: false, email, password });
    if (signRes?.ok) window.location.href = "/dashboard";
    else setStatus("Account created — please sign in.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-24 -top-28 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/65 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-[28rem] w-[28rem] rounded-full bg-indigo-600/65 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-xl flex-col justify-center px-6 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100/85">Enrollment</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your campus credential</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/72">
          Hashing salts live in DynamoDB or encrypted local fixtures. Roles drive middleware redirects (<span className="font-mono">admin</span>
          ,&nbsp;<span className="font-mono">teacher</span>, <span className="font-mono">student</span>).
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-7 shadow-2xl shadow-black/35 backdrop-blur-xl"
        >
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
            required
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
            required
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
            required
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin (demo gate)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Class roster</label>
              <input
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={role !== "student"}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-indigo-300/35 focus:ring disabled:cursor-not-allowed disabled:opacity-40"
              />
              <div className="mt-2 text-[11px] text-white/50">Ignored for faculty/admin accounts.</div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-indigo-50"
          >
            Create account & sign in
          </button>

          {status ? <div className="mt-4 text-sm text-white/85">{status}</div> : null}

          <p className="mt-6 text-sm text-white/65">
            Already onboard?{" "}
            <Link className="font-semibold text-white underline decoration-white/30 hover:text-indigo-100" href="/signin">
              Sign in
            </Link>
          </p>
          <div className="mt-4 text-xs text-white/55">
            Alias:&nbsp;
            <Link className="underline decoration-white/40 hover:text-white" href="/register">
              /register
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
