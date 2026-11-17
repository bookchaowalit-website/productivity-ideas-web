import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// The font variable sits on <html>: the App shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ideas | Bookchaowalit",
  description: "A private-by-default instrument for moving loose thoughts one next step forward.",
  keywords: ["ideas", "portfolio"],
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL("https://ideas.bookchaowalit.com"),
  openGraph: {
    type: "website",
    title: "Ideas | Bookchaowalit",
    description: "A private-by-default instrument for moving loose thoughts one next step forward.",
    siteName: "Bookchaowalit",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
