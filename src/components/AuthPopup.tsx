'use client';

import React, { useState } from 'react';
import { Compass, Plus, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';

export default function AuthPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const { isSignedIn } = useAuth();

  // Close popup if user becomes signed in
  React.useEffect(() => {
    if (isSignedIn) {
      setIsOpen(false);
    }
  }, [isSignedIn]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm px-4 py-6">
      <div className="relative bg-[#f5f2eb] rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-white/50 overflow-hidden">
        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }}></div>
        
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors z-10"
        >
          <X size={20} className="text-stone-400" />
        </button>

        {/* Content */}
        <div className="space-y-6 relative z-10">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center bg-stone-900 rounded-2xl shadow-xl transform -rotate-3">
              <Compass className="h-10 w-10 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900 handwritten">Welcome to Waypoint</h2>
            <p className="text-stone-700 font-medium">
              Transform your travel photos into interactive scrapbook maps. Sign in to start preserving your journey.
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="space-y-3">
            <SignInButton mode="modal">
              <button className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-all shadow-md active:scale-95 cursor-pointer">
                Sign In to Waypoint
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="w-full flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-200 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 transition-all shadow-sm active:scale-95 cursor-pointer">
                Create Free Account
              </button>
            </SignUpButton>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f5f2eb] px-4 text-stone-500 font-bold">Or Explore</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3">
            <Link
              href="/trips/new"
              className="flex items-center justify-center gap-2 bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition-all shadow-md active:scale-95"
            >
              <Plus size={18} />
              Add Your First Trip
            </Link>

            <Link
              href="/trips/new?quickUpload=1#photos"
              className="flex items-center justify-center gap-2 bg-stone-200 text-stone-800 px-6 py-3 rounded-xl font-medium hover:bg-stone-300 transition-all shadow-sm active:scale-95"
            >
              <Upload size={18} />
              Quick Photo Upload
            </Link>
          </div>

          {/* Info */}
          <p className="text-[10px] text-stone-500 text-center italic">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
