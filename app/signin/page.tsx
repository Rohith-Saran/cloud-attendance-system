import Link from "next/link";
import CredentialsSignIn from "~/components/CredentialsSignIn";

export default async function SignInPage() {


  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-sky-400 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-14 md:flex-row md:items-center md:gap-14">
        <div className="md:w-1/2">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100/80">
            Cloud Smart Attendance
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            One console for Wi‑Fi pings, roster speed-runs, and QR trust.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/75">
            Middleware enforces JWT roles on every <span className="font-mono text-xs text-white">/dashboard/*</span> route.
            Teachers orchestrate three attendance layers; students stay honest through rotating HMAC codes + campus IP tenancy.
          </p>
        </div>

        <div className="mt-10 w-full md:mt-0 md:w-1/2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xl font-semibold tracking-tight text-white">Sign in</div>
              <Link href="/signup" className="text-xs font-semibold text-indigo-50/90 hover:text-white">
                Need an account?
              </Link>
            </div>

            <div className="mt-6 space-y-6">
              <CredentialsSignIn />

              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Aliases</div>

                <div className="mt-4 text-xs text-white/55">
                  <Link className="underline decoration-white/40 hover:text-white" href="/login">
                    /login
                  </Link>
                  &nbsp;redirects here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
