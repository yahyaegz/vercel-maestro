import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Maestro",
  description: "Neural Symphony Engine",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script src="https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/es6/magentamusic.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/html-midi-player@1.5.0/dist/midi-player.min.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
