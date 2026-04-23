import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Waypoint | Your Travel Atlas",
  description: "Turn your travel photos into interactive maps and memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className={`${inter.className} min-h-full flex flex-col`}>
          <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#d4a373] rounded-full flex items-center justify-center text-white font-bold">W</div>
                <h1 className="text-xl font-semibold tracking-tight">Waypoint</h1>
              </div>
              <nav>
                {/* Auth components will go here */}
              </nav>
            </div>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
