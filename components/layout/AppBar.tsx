'use client';

import Link from 'next/link';
import AccountMenu from '@/components/account/AccountMenu';

export default function AppBar() {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-400">
      <div className="max-w-[88%] mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-black hover:text-gray-700 transition-colors"
        >
          <div className="relative">
            <div className="bg-yellow-300 w-24 h-5 -mb-6 ml-0.5 rounded-sm"></div>
            <h2 className="text-lg font-semibold relative z-10">Timeline</h2>
          </div>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm text-gray-700 hover:text-black transition-colors"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-sm text-gray-700 hover:text-black transition-colors"
          >
            How to Play
          </Link>
        </div>

        {/* Account menu */}
        <div className="flex items-center">
          <AccountMenu />
        </div>
      </div>
    </div>
  );
}
