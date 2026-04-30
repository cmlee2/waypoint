'use client';

import React, { useState } from 'react';
import { Map as MapIcon, Plus, Upload, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X size={20} className="text-stone-400" />
        </button>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center bg-stone-100 rounded-2xl">
              <MapIcon className="h-8 w-8 text-stone-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">Welcome to Waypoint</h2>
            <p className="text-stone-600">
              Transform your travel photos into interactive scrapbook maps. Sign in to start creating your journey.
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="space-y-3">
            <SignInButton mode="modal">
              <button className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors">
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="w-full flex items-center justify-center gap-2 border-2 border-stone-300 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 transition-colors">
                Create Account
              </button>
            </SignUpButton>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400">Or start with</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3">
            <Link
              href="/trips/new"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Add Your First Trip
            </Link>

            <Link
              href="/trips/new?quickUpload=1#photos"
              className="flex items-center justify-center gap-2 border-2 border-stone-300 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 transition-colors"
            >
              <Upload size={18} />
              Quick Upload
            </Link>
          </div>

          {/* Info */}
          <p className="text-xs text-stone-400 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
