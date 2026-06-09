"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Wind } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function RegisterContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    loading,
    error,
    clearError,
    signUpWithEmailPassword,
    signInWithGoogle,
  } = useAuth();

  const returnUrl = useMemo(() => {
    const param = searchParams?.get("returnUrl");
    return param && param.startsWith("/") ? param : "/dashboard";
  }, [searchParams]);

  const lang = (searchParams?.get("lang") === "id" || returnUrl.includes("lang=id")) ? "id" : "en";
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const translateAuthError = (errStr: string | null) => {
    if (!errStr) return null;
    if (errStr.includes("Invalid email or password.")) {
      return t("Invalid email or password.", "Email atau kata sandi salah.");
    }
    if (errStr.includes("Account not found.")) {
      return t("Account not found.", "Akun tidak ditemukan.");
    }
    if (errStr.includes("Too many attempts. Try again later.")) {
      return t("Too many attempts. Try again later.", "Terlalu banyak percobaan. Coba lagi nanti.");
    }
    if (errStr.includes("Email is already in use.")) {
      return t("Email is already in use.", "Email sudah digunakan.");
    }
    if (errStr.includes("Invalid email address.")) {
      return t("Invalid email address.", "Alamat email tidak valid.");
    }
    if (errStr.includes("Password is too weak.")) {
      return t("Password is too weak.", "Kata sandi terlalu lemah.");
    }
    if (errStr.includes("Google sign-in was closed before completion.")) {
      return t("Google sign-in was closed before completion.", "Pendaftaran Google ditutup sebelum selesai.");
    }
    if (errStr.includes("Popup blocked. Please allow popups and try again.")) {
      return t("Popup blocked. Please allow popups and try again.", "Popup diblokir. Harap izinkan popup dan coba lagi.");
    }
    if (errStr.includes("Another sign-in window is already open.")) {
      return t("Another sign-in window is already open.", "Jendela masuk lainnya sedang terbuka.");
    }
    if (errStr.includes("Authentication failed.")) {
      return t("Authentication failed.", "Autentikasi gagal.");
    }
    return errStr;
  };

  useEffect(() => {
    if (user) {
      let targetUrl = returnUrl;
      if (lang === "id" && !targetUrl.includes("lang=id")) {
        targetUrl += targetUrl.includes("?") ? "&lang=id" : "?lang=id";
      }
      router.replace(targetUrl);
    }
  }, [router, returnUrl, user, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim() || !password || !confirmPassword) {
      setFormError(t("Email and password are required.", "Email dan kata sandi wajib diisi."));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t("Password and confirmation do not match.", "Sandi dan konfirmasi sandi tidak cocok."));
      return;
    }

    await signUpWithEmailPassword(email.trim(), password);
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

          {/* Back to Home Navigation Link */}
          <div className="mb-4">
            <Link
              href={`/?lang=${lang}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
            >
              &larr; {t("Back to Home", "Kembali ke Beranda")}
            </Link>
          </div>

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
              {t("Create Account", "Buat Akun")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{t("Join the smart IoT platform", "Bergabung dengan platform IoT pintar")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                {t("Email Address", "Alamat Email")}<span className="ml-0.5 text-rose-500">*</span>
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
                {t("Password", "Kata Sandi")}<span className="ml-0.5 text-rose-500">*</span>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm"
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                {t("Confirm Password", "Konfirmasi Kata Sandi")}<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (formError) setFormError(null);
                  if (error) clearError();
                }}
                placeholder="••••••••••••"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm"
              />
            </div>

            {(formError || error) && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {formError || translateAuthError(error)}
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
                  {t("Creating Account...", "Membuat Akun...")}
                </span>
              ) : (
                t("Create Free Account", "Buat Akun Gratis")
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("Social Registration", "Pendaftaran Sosial")}</span>
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
            {t("Register with Google", "Daftar dengan Google")}
          </button>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            {t("Already have an account?", "Sudah punya akun?")}{" "}
            <Link
              href={`/auth/login?lang=${lang}`}
              className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              {t("Sign in here", "Masuk di sini")}
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
                <p className="text-xl font-bold leading-tight text-white">Smart Clothesline</p>
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
              <h2 className="text-4xl font-extrabold leading-tight text-white">
                {t("Smart laundry,", "Jemuran pintar,")}
                <br />
                <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent italic">{t("smarter living.", "hidup lebih cerdas.")}</span>
              </h2>
              <p className="max-w-xs text-base leading-relaxed text-slate-300 font-medium">
                {t("Monitor and automate your clothesline from anywhere with real-time IoT sensors.", "Pantau dan otomatiskan jemuran Anda dari mana saja dengan sensor IoT realtime.")}
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {[t("Auto Retract", "Tarik Otomatis"), t("Rain Sensor", "Sensor Hujan"), t("Remote Control", "Kontrol Jarak Jauh")].map((feat) => (
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-teal-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
