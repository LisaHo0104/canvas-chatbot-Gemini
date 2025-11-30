import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainNavBar from "@/components/MainNavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lulu",
  description: "Lulu — Canvas chatbot and study assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`h-full flex flex-col ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MainNavBar />
        <div className="flex-1 min-h-0 overflow-x-hidden">{children}</div>
      </body>
    </html>
  );
}
