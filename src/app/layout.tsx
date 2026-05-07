import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import ThemeInitializer from "@/components/layout/ThemeInitializer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Clothesline Dashboard",
  description: "IoT-powered smart clothesline system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="m-0 h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <ThemeInitializer />
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
