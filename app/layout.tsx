import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local'
import { Suspense } from "react";


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
       <body
        className={`${dinBold.variable} ${dinNormal.variable} ${dinCondensed.variable} ${dinItalic.variable} ${dinXBold.variable} antialiased`}
      >
            <Suspense fallback={<div>Loading...</div>}>
        {children}
        </Suspense>
      </body>
    </html>
  );
}
