/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import "./globals.css";
import localFont from "next/font/local";
import { Suspense, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useTermsModal } from '@/hooks/use-terms-modal';
import DebugPanel from './debug';
import { TenantProvider } from './netvend/contexts/tenant-context';

// Load Fonts
const dinBold = localFont({ src: "./fonts/D-DIN-Bold.ttf", variable: "--font-din-bold", weight: "100 900" });
const dinItalic = localFont({ src: "./fonts/D-DIN-Italic.ttf", variable: "--font-din-italic", weight: "100 900" });
const dinNormal = localFont({ src: "./fonts/D-DIN.ttf", variable: "--font-din-normal", weight: "100 900" });
const dinCondensed = localFont({ src: "./fonts/D-DINCondensed.ttf", variable: "--font-din-condensed", weight: "100 900" });
const dinXBold = localFont({ src: "./fonts/D-DINExp.ttf", variable: "--font-din-xbold", weight: "100 900" });

// Persistent Query Client Setup
const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 5,
        retry: false,
        networkMode: "always",
      },
    },
  });

  if (typeof window !== "undefined") {
    const localStoragePersister = createSyncStoragePersister({
      storage: window.localStorage,
    });

    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
    });
  }

  return queryClient;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(createQueryClient); // Ensures `queryClient` persists across renders
  const TermsModal = useTermsModal();

  return (
    <html lang="en">
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <link rel="icon" href="/icons/favicon.ico" />
      <meta name="theme-color" content="#000000" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

      <body className={`${dinBold.variable} ${dinNormal.variable} ${dinCondensed.variable} ${dinItalic.variable} ${dinXBold.variable} antialiased`}>
      <TenantProvider>
        <QueryClientProvider client={queryClient}>
          <SpeedInsights />
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          {TermsModal}
          <DebugPanel />
        </QueryClientProvider>
        </TenantProvider>
      </body>
    </html>
  );
}