"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wind, ArrowLeft } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const lang = searchParams?.get("lang") === "id" ? "id" : "en";
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);

    if (!isValidEmail(email)) {
      setErrorMsg(t(
        "We could not send the reset link. Please check the email format and try again.",
        "Tautan reset belum dapat dikirim. Periksa format email dan coba lagi."
      ));
      return;
    }

    setLoading(true);
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

      await sendPasswordResetEmail(
        auth,
        email.trim(),
        baseUrl
          ? {
              url: `${baseUrl.replace(/\/$/, "")}/auth/login`,
              handleCodeInApp: false,
            }
          : undefined
      );
      setSuccess(true);
      setEmail("");
    } catch (error: any) {
      console.error("[ForgotPassword] Password reset failed", error);
      if (error?.code === "auth/user-not-found") {
        // Obfuscate user existence to protect privacy
        setSuccess(true);
        setEmail("");
      } else {
        setErrorMsg(t(
          "We could not send the reset link. Please check the email format and try again.",
          "Tautan reset belum dapat dikirim. Periksa format email dan coba lagi."
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm">
        
        {/* ─── LEFT: Form ─────────────────────────────────── */}
        <div className="flex w-full flex-col justify-center bg-white/80 px-12 py-14 md:w-1/2">
          {/* Back to Login */}
          <div className="mb-4">
            <Link
              href={`/auth/login?lang=${lang}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("Back to login", "Kembali ke login")}
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
              {t("Reset your password", "Reset kata sandi")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t(
                "Enter the email address connected to your Smart Clothesline account. We will send a password reset link if the account exists.",
                "Masukkan email yang terhubung dengan akun Smart Clothesline. Kami akan mengirim tautan reset kata sandi jika akun tersedia."
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                {t("Email address", "Alamat email")}<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="operator@smartclothesline.local"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm"
              />
            </div>

            {success && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-600 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {t(
                  "If an account exists for this email, a reset link has been sent. Please check your inbox.",
                  "Jika akun dengan email ini tersedia, tautan reset kata sandi telah dikirim. Silakan cek kotak masuk email Anda."
                )}
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {errorMsg}
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
                  {t("Sending...", "Mengirim...")}
                </span>
              ) : (
                t("Send reset link", "Kirim tautan reset")
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500 font-semibold">
            <Link
              href={`/?lang=${lang}`}
              className="text-slate-500 hover:text-teal-600 transition-colors"
            >
              {t("Back to Home", "Kembali ke Beranda")}
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
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-teal-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
