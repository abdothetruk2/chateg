import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Egchat | Real-time Chat App",
    template: "%s | Egchat",
  },
  description:
    "Egchat is a real-time chat app built with Next.js, MongoDB, Socket.io, Tailwind CSS, and AI features.",
  applicationName: "Egchat",
  keywords: [
    "Egchat",
    "realtime chat app",
    "Next.js chat",
    "Socket.IO",
    "WebRTC calls",
    "MongoDB portfolio project",
  ],
  authors: [{ name: "Abdo Khater" }],
  creator: "Abdo Khater",
  openGraph: {
    title: "Egchat | Real-time Chat App",
    description:
      "Realtime messaging, rooms, posts, stories, profile covers, and browser calls.",
    url: "/",
    siteName: "Egchat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egchat | Real-time Chat App",
    description:
      "Full-stack chat portfolio app with realtime rooms, media, and calls.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="app-shell min-h-screen flex flex-col font-sans antialiased">
        <ThemeProvider>
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
