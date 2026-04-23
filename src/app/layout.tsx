import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
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
        <body className={`${inter.className} min-h-full flex flex-col bg-stone-50`}>
          <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">W</div>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">Waypoint</h1>
              </div>
              <nav className="flex items-center gap-6">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm font-medium bg-stone-900 text-white px-5 py-2 rounded-full hover:bg-stone-800 shadow-sm transition-all active:scale-95">Sign Up</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="flex items-center gap-4">
                    <a href="/dashboard" className="text-sm font-medium text-stone-600 hover:text-stone-900">Dashboard</a>
                    <UserButton />
                  </div>
                </Show>
              </nav>
            </div>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
