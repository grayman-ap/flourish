import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local'
import { Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next"
const dinBold = localFont({
  src: './fonts/D-DIN-Bold.ttf',
  variable: '--font-din-bold',
  weight: '100 900',
})
const dinItalic = localFont({
  src: './fonts/D-DIN-Italic.ttf',
  variable: '--font-din-italic',
  weight: '100 900',
})
const dinNormal = localFont({
  src: './fonts/D-DIN.ttf',
  variable: '--font-din-normal',
  weight: '100 900',
})
const dinCondensed = localFont({
  src: './fonts/D-DINCondensed.ttf',
  variable: '--font-din-condensed',
  weight: '100 900',
})
const dinXBold = localFont({
  src: './fonts/D-DINExp.ttf',
  variable: '--font-din-xbold',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: "Flourish Internet Service",
  description: "Generate vouchers for starlink networks in few minutes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       <link rel="manifest" href="/manifest.json" />
       <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            <link rel="icon" href="/icons/favicon.ico" />
            <meta name="theme-color" content="#000000" />
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
            />
       <body
        className={`${dinBold.variable} ${dinNormal.variable} ${dinCondensed.variable} ${dinItalic.variable} ${dinXBold.variable} antialiased`}
      >
        <SpeedInsights />
            <Suspense fallback={<div>Loading...</div>}>
        {children}
        </Suspense>
      </body>
    </html>
  );
}
