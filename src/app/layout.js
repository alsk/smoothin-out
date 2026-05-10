import { Work_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Easing Editor",
  description: "Visual editor for vector easing curves",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${workSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
