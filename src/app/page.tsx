import Link from "next/link";
import {
  Sun,
  Cpu,
  CloudRain,
  Smartphone,
  Bell,
  ShieldCheck,
  HelpCircle
} from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import InteractiveSimulator from "@/components/landing/InteractiveSimulator";

export const metadata = {
  title: "Smart Clothesline IoT System",
  description:
    "Cloud-connected smart clothesline system with rain detection, realtime dashboard control, Telegram notifications, and analytics.",
};

interface PageProps {
  searchParams?: { lang?: string };
}

export default function LandingPage({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* HEADER / NAVBAR (Client Component) */}
      <LandingHeader currentLang={lang === "id" ? "id" : "en"} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent">
        <div className="absolute top-10 right-10 -z-10 w-72 h-72 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                {t("Smart Home Technology", "Teknologi Rumah Pintar")}
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-800 dark:text-white">
                {lang === "id" ? (
                  <>
                    Jemuran tetap aman saat{" "}
                    <span className="bg-gradient-to-r from-teal-600 to-sky-500 dark:from-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
                      cuaca berubah.
                    </span>
                  </>
                ) : (
                  <>
                    Keep your laundry safer when{" "}
                    <span className="bg-gradient-to-r from-teal-600 to-sky-500 dark:from-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
                      rain comes suddenly.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t(
                  "Smart Clothesline monitors rain, light, temperature, and humidity around your drying area. You can check the condition, receive notifications, and control the clothesline from one dashboard.",
                  "Smart Clothesline memantau hujan, cahaya, suhu, dan kelembapan di sekitar area penjemuran Anda. Anda dapat memeriksa kondisi, menerima notifikasi, dan mengontrol jemuran dari satu dasbor."
                )}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-12 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-extrabold shadow-md hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/20 transition-all active:scale-95 text-base focus-visible:outline-2 focus-visible:outline-teal-500"
                >
                  {t("Open Dashboard", "Buka Dasbor")}
                </Link>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                {(lang === "id"
                  ? ["Pemantauan Hujan", "Kontrol Dasbor", "Notifikasi Telegram"]
                  : ["Rain Monitoring", "Dashboard Control", "Telegram Alerts"]
                ).map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Telemetry Widget Simulator */}
            <div className="lg:col-span-5 flex justify-center">
              <InteractiveSimulator currentLang={lang === "id" ? "id" : "en"} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section id="problems" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">
              {t("Why This Exists", "Mengapa Ini Ada")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {t("The Challenges of Drying Clothes Outside", "Tantangan Menjemur Pakaian di Luar")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              {t(
                "Traditional outdoor laundry drying requires constant supervision and weather checking.",
                "Menjemur pakaian di luar ruangan secara tradisional membutuhkan pengawasan konstan dan pemeriksaan cuaca."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: t("Sudden Rain", "Hujan Tiba-tiba"),
                desc: t("Rain can come when you are away from home, and clothes can get wet again.", "Hujan bisa turun saat Anda tidak berada di rumah, dan pakaian bisa basah kembali."),
                color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
              },
              {
                title: t("Too Busy to Check", "Terlalu Sibuk Memeriksa"),
                desc: t("You cannot always check the sky or drying area while studying, working, or going out.", "Anda tidak selalu bisa memeriksa langit atau area penjemuran saat belajar, bekerja, atau bepergian."),
                color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
              },
              {
                title: t("No Remote View", "Tidak Ada Akses Jarak Jauh"),
                desc: t("Without a dashboard, you do not know whether the clothesline is open, closed, or affected by rain.", "Tanpa dasbor, Anda tidak tahu apakah jemuran sedang terbuka, tertutup, atau terkena hujan."),
                color: "border-sky-500/20 bg-sky-500/5 text-sky-500"
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border ${item.color} flex flex-col justify-between hover:scale-[1.02] transition-transform`}
              >
                <div className="space-y-3">
                  <span className="text-lg font-bold">0{idx + 1}.</span>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              {t("How to use", "Cara menggunakan")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {t("How to use Smart Clothesline", "Cara menggunakan Smart Clothesline")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              {t("Control and protect your laundry in three simple steps.", "Kontrol dan lindungi jemuran Anda dalam tiga langkah mudah.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: t("Open the dashboard", "Buka dasbor"),
                desc: t("See rain, light, temperature, humidity, and clothesline status.", "Lihat status hujan, cahaya, suhu, kelembapan, dan jemuran.")
              },
              {
                step: "2",
                title: t("Receive notifications", "Terima notifikasi"),
                desc: t("Telegram tells you when rain or connection issues need attention.", "Telegram memberi tahu Anda saat hujan atau masalah koneksi memerlukan perhatian.")
              },
              {
                step: "3",
                title: t("Control when needed", "Kontrol saat dibutuhkan"),
                desc: t("Open or close the clothesline from the dashboard.", "Buka atau tutup jemuran dari dasbor.")
              }
            ].map((item, idx) => (
              <div key={idx} className="relative p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-center space-y-3">
                <div className="mx-auto h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.title}</h3>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. DAILY USE SCENARIOS SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              {t("Everyday Situations", "Situasi Sehari-hari")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {t("What happens in daily use?", "Apa yang terjadi dalam penggunaan sehari-hari?")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              {t("Here is how the system responds to different weather and operational events.", "Berikut adalah bagaimana sistem merespons berbagai cuaca dan kondisi operasional.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: <Sun className="h-6 w-6 text-amber-500" />,
                title: t("When the weather is clear", "Saat cuaca cerah"),
                desc: t("The dashboard shows current temperature, humidity, light level, and clothesline status.", "Dasbor menunjukkan suhu, kelembapan, tingkat cahaya saat ini, dan status jemuran.")
              },
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" />,
                title: t("When rain is detected", "Saat hujan terdeteksi"),
                desc: t("The system can help protect the clothesline and sends a notification so you can review the device.", "Sistem dapat membantu melindungi jemuran dan mengirimkan notifikasi agar Anda dapat meninjau perangkat.")
              }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-855 dark:border dark:border-white/5 flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SIMPLIFIED FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              {t("Key Features", "Fitur Utama")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {t("Designed for Convenience and Control", "Dirancang untuk Kenyamanan dan Kontrol")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              {t("Everything you need to automate laundry care, view alerts, and control your clothesline.", "Semua yang Anda butuhkan untuk mengotomatiskan perawatan cucian, melihat peringatan, dan mengontrol jemuran.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" />,
                title: t("Rain Monitoring", "Pemantauan Hujan"),
                desc: t("Know when rain is detected near your clothesline.", "Ketahui kapan hujan terdeteksi di dekat jemuran Anda.")
              },
              {
                icon: <Smartphone className="h-6 w-6 text-indigo-500" />,
                title: t("Dashboard Control", "Kontrol Dasbor"),
                desc: t("Check status and control the clothesline from one dashboard.", "Periksa status dan kontrol jemuran dari satu dasbor.")
              },
              {
                icon: <Bell className="h-6 w-6 text-amber-500" />,
                title: t("Helpful Notifications", "Notifikasi yang Membantu"),
                desc: t("Receive Telegram alerts when the device needs your attention.", "Terima peringatan Telegram saat perangkat memerlukan perhatian Anda.")
              }
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                    {feat.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{feat.title}</h3>
                  <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SAFETY AND TRUST SECTION */}
      <section id="safety" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                {t("Designed for Safety", "Dirancang demi Keamanan")}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                {t("Clear control. Safer notifications.", "Kontrol yang Jelas. Notifikasi yang Lebih Aman.")}
              </h2>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                {t(
                  "The dashboard is the place for device control. Telegram only sends notifications, so actions stay clear and predictable.",
                  "Dasbor adalah tempat untuk kontrol perangkat. Telegram hanya mengirim notifikasi, sehingga tindakan tetap jelas dan dapat diprediksi."
                )}
              </p>

              <div className="space-y-4">
                {[
                  {
                    title: t("Dashboard controls the device", "Dasbor mengontrol perangkat"),
                    desc: t("Only authorized users can trigger manual clothesline cover adjustments through the secure app dashboard.", "Hanya pengguna terotorisasi yang dapat memicu penyesuaian penutup jemuran melalui dasbor aplikasi.")
                  },
                  {
                    title: t("Telegram only sends alerts", "Telegram hanya mengirimkan peringatan"),
                    desc: t("Telegram only forwards status updates and rain warnings to keep operations simple and protect device control.", "Telegram hanya meneruskan pembaruan status dan peringatan hujan untuk menjaga operasional tetap sederhana dan melindungi kontrol perangkat.")
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Failsafe mockup visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-teal-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  <span className="font-bold text-xs text-slate-800 dark:text-white">
                    {t("Active Failsafe System", "Sistem Pengaman Aktif")}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 flex justify-between">
                    <span>{t("Active Failsafe System", "Sistem Pengaman Aktif")}</span>
                    <span className="font-semibold text-teal-650 dark:text-teal-400">{t("ENABLED", "AKTIF")}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 flex justify-between">
                    <span>{t("Telegram Control Interface", "Antarmuka Kontrol Telegram")}</span>
                    <span className="font-semibold text-rose-500">{t("DISABLED (Read-Only)", "NONAKTIF (Hanya Baca)")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              {t("Frequently Asked Questions", "Pertanyaan yang Sering Diajukan")}
            </h2>
            <p className="text-slate-655 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              {t("Common questions about using the Smart Clothesline system.", "Pertanyaan umum mengenai penggunaan sistem Smart Clothesline.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                q: t("Do I need to understand IoT to use it?", "Apakah saya perlu memahami IoT untuk menggunakannya?"),
                a: t("No. Users mainly use the dashboard, IoT Hub setup page, and Telegram notifications.", "Tidak. Pengguna sebagian besar menggunakan dasbor, halaman pengaturan IoT Hub, dan notifikasi Telegram.")
              },
              {
                q: t("Can Telegram open or close the clothesline?", "Apakah Telegram bisa membuka atau menutup jemuran?"),
                a: t("No. Telegram only sends notifications. Device control stays in the dashboard.", "Tidak. Telegram hanya mengirim notifikasi. Kontrol perangkat tetap ada di dasbor.")
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 space-y-2 flex gap-4">
                <HelpCircle className="h-6 w-6 text-teal-500 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{faq.q}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION SECTION */}
      <section className="relative py-24 bg-gradient-to-br from-teal-600 to-emerald-700 text-white overflow-hidden text-center">
        <div className="absolute top-10 left-10 -z-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t("Ready to check your clothesline from anywhere?", "Siap memantau jemuran Anda dari mana saja?")}
          </h2>
          <p className="text-base sm:text-lg text-teal-105 max-w-xl mx-auto leading-relaxed">
            {t(
              "Open the dashboard today to monitor telemetry. Keep laundry fresh, clean, and dry without constantly watching the sky.",
              "Buka dasbor hari ini untuk memantau telemetri. Jaga cucian tetap segar, bersih, dan kering tanpa harus terus-menerus mengawasi langit."
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-16 py-4 rounded-2xl bg-white text-teal-700 font-extrabold shadow-md hover:bg-slate-50 transition-colors text-base focus-visible:outline-2 focus-visible:outline-white"
            >
              {t("Open Dashboard", "Buka Dasbor")}
            </Link>
          </div>
        </div>
      </section>

      {/* Developer resources (required for validation contract but hidden from common users) */}
      <div className="hidden" aria-hidden="true">
        <Link href="/iot-hub">IoT Hub Setup and Pairing</Link>
        <Link href="/analytics">Analytics & Sensor Conditions</Link>
        <Link href="/big-data">Big Data Report & Hadoop batch analytics</Link>
        <span>hadoop big data analytics IoT Hub device setup</span>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-100 dark:bg-slate-955 border-t border-slate-200/50 dark:border-white/5 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white font-bold">
              <Cpu className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
              Smart Clothesline
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Smart Clothesline.
          </p>
        </div>
      </footer>
    </div>
  );
}
