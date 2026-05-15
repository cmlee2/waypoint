import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Compass } from "lucide-react";
import "./globals.css";

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
        <body className="min-h-full flex flex-col antialiased">
          <header className="border-b border-stone-200 bg-[#f5f2eb]/80 backdrop-blur-md flex-shrink-0 z-50 sticky top-0 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
                <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:bg-amber-700 transition-colors">
                  <Compass className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900">Waypoint</h1>
              </a>
              <nav className="flex items-center gap-6">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm font-medium bg-stone-900 text-white px-5 py-2 rounded-full hover:bg-stone-800 shadow-md transition-all active:scale-95 cursor-pointer">Sign Up</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="flex items-center gap-4">
                    <a href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">Home</a>
                    <UserButton />
                  </div>
                </Show>
              </nav>
            </div>
          </header>
          {/* We let individual pages handle their own scrolling behavior */}
          <main className="flex-1 flex flex-col min-h-0">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
