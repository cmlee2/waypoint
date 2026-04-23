import { Map as MapIcon, Plus, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#muted] scrapbook-border flex items-center justify-center">
            <MapIcon className="w-8 h-8 text-[#accent]" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Your Atlas is Empty</h2>
          <p className="text-muted-foreground text-lg">
            Every great journey starts with a single photo. Add your first trip to begin building your map.
          </p>
        </div>

        <div className="grid gap-4">
          <button className="flex items-center justify-center gap-2 w-full bg-[#accent] text-white py-4 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-md">
            <Plus className="w-5 h-5" />
            Add Your First Trip
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#border]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#background] px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 w-full border-2 border-[#border] py-4 px-6 rounded-lg font-semibold hover:bg-[#muted] transition-colors">
            <Upload className="w-5 h-5" />
            Quick Upload
          </button>
        </div>
      </div>
      
      {/* Visual background placeholder for the empty map */}
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border-2 border-dashed border-[#accent] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border-2 border-dashed border-[#accent] rounded-full animate-pulse delay-700" />
      </div>
    </div>
  );
}
