
import type { Metadata } from "next"; 
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Collabrative Sheets Real-time Collaboration",
  description: "Collaborative spreadsheets built for modern teams.",
  icons: { icon: '/icon.jpg' }, 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-slate-900`}>
        {children}
      </body>
    </html>
  );
}