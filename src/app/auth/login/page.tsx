"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Wind } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    loading,
    error,
    clearError,
    signInWithEmailPassword,
    signInWithGoogle,
  } = useAuth();

  const returnUrl = useMemo(() => {
    const param = searchParams?.get("returnUrl");
    return param && param.startsWith("/") ? param : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.replace(returnUrl);
    }
  }, [router, returnUrl, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim() || !password) {
      setFormError("Email and password are required.");
      return;
    }

    await signInWithEmailPassword(email.trim(), password, rememberMe);
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    clearError();
    await signInWithGoogle();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm">

        {/* ─── LEFT: Form ─────────────────────────────────── */}
        <div className="flex w-full flex-col justify-center bg-white/80 px-12 py-14 md:w-1/2">

          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative h-12 w-14 group">
              <div className="absolute left-0 top-2.5 h-8 w-8 rounded-full border-[3px] border-teal-500 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute left-5 top-2.5 h-8 w-8 rounded-full border-[3px] border-emerald-400 group-hover:scale-110 transition-transform duration-300 delay-75" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Welcome Back!
            </h1>
            <p className="mt-2 text-sm text-slate-500">Access your smart clothesline dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                Email Address<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                  if (error) clearError();
                }}
                placeholder="operator@smartclothesline.local"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                Password<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError(null);
                    if (error) clearError();
                  }}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-12 text-sm text-slate-900 placeholder:text-gray-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between px-1">
              <label 
                className="flex cursor-pointer items-center gap-2.5 select-none group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                    rememberMe
                      ? "border-teal-500 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                      : "border-slate-300 bg-white group-hover:border-teal-400"
                  }`}
                >
                  {rememberMe && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Remember Me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:underline decoration-teal-600/30 underline-offset-4 transition-all"
              >
                Forgot Password?
              </Link>
            </div>

            {(formError || error) && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {formError || error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl bg-teal-600 py-4 text-sm font-bold text-white transition-all hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Login to Dashboard"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Secure Social Login</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              Create Free Account
            </Link>
          </p>
        </div>

        {/* ─── RIGHT: Sidebar ──────────────────────────────── */}
        <div className="relative hidden overflow-hidden md:block md:w-1/2 bg-slate-900">
          {/* Decorative background with gradient and dots */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-slate-900 to-emerald-900 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            {/* Top branding */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                <Wind className="h-6 w-6 text-teal-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400/80">Premium</p>
                <p className="text-xl font-bold leading-tight text-white">IoT Dashboard</p>
              </div>
            </div>

            {/* Middle decorative element - Clothesline Visual */}
            <div className="flex justify-center py-12 opacity-40 group hover:opacity-70 transition-opacity duration-500">
              <svg width="280" height="80" viewBox="0 0 340 100" fill="none" className="drop-shadow-2xl">
                <line x1="10" y1="18" x2="330" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                {[
                  [40, 18, 28, 40], [80, 20, 22, 35], [114, 19, 30, 45],
                  [158, 21, 26, 38], [198, 20, 20, 36], [232, 22, 28, 42], [275, 21, 22, 38],
                ].map(([x, y, w, h], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="white" className="animate-pulse" style={{ animationDelay: `${i * 150}ms`, animationDuration: '3s' }} />
                ))}
                {[41, 81, 115, 159, 199, 233, 276].map((cx, i) => (
                  <circle key={i} cx={cx} cy={[18, 20, 19, 21, 20, 22, 21][i]} r="4" fill="teal" fillOpacity="0.8" />
                ))}
              </svg>
            </div>

            {/* Bottom copy */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-1 w-10 rounded-full bg-teal-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-teal-400/60">Version 2.0.4</span>
              </div>
              <h2 className="text-4xl font-extrabold leading-tight text-white">
                Smart laundry,
                <br />
                <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent italic">smarter living.</span>
              </h2>
              <p className="max-w-xs text-base leading-relaxed text-slate-300 font-medium">
                Monitor and automate your clothesline from anywhere with real-time IoT sensors.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {["Auto Retract", "Rain Sensor", "Remote Control"].map((feat) => (
                  <span
                    key={feat}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-teal-100 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-teal-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
