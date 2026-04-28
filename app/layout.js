import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PageTransition from "./components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Egchat",
  description:
    "Fast real-time chat for groups, friends, calls, and status updates.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="app-shell min-h-screen flex flex-col font-sans antialiased">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}