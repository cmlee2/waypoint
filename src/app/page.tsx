import Link from "next/link";
import { Map as MapIcon, Plus, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center scrapbook-border bg-[var(--muted)]">
            <MapIcon className="h-8 w-8 text-[var(--foreground)]" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Your Atlas is Empty</h2>
          <p className="text-lg text-[color:rgba(61,61,61,0.86)]">
            Every great journey starts with a single photo. Add your first trip to begin building your map.
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/trips/new"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white shadow-md transition-all hover:brightness-95"
          >
            <Plus className="w-5 h-5" />
            Add Your First Trip
          </Link>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--background)] px-2 text-[color:rgba(61,61,61,0.72)]">Or</span>
            </div>
          </div>

          <Link
            href="/trips/new?quickUpload=1#photos"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--foreground)] px-6 py-4 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <Upload className="w-5 h-5" />
            Quick Upload
          </Link>
        </div>
      </div>
      
      {/* Visual background placeholder for the empty map */}
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full border-2 border-dashed border-[var(--border)] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full border-2 border-dashed border-[var(--border)] animate-pulse delay-700" />
      </div>
    </div>
  );
}
