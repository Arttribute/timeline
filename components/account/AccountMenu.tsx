'use client';

import { usePrivy } from '@privy-io/react-auth';
import RandomAvatar from './RandomAvatar';

function AccountMenu() {
  const { login, logout, authenticated, user } = usePrivy();

  return (
    <>
      {authenticated && user ? (
        <div className="relative group">
          <button className="rounded-full overflow-hidden hover:opacity-80 transition-opacity">
            <RandomAvatar username={user.email?.address || user.id || 'User'} size={32} />
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-400 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="px-4 py-2 border-b border-gray-400">
              <p className="text-sm font-medium truncate">
                {user.email?.address || user.id}
              </p>
            </div>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors">
              Profile
            </button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors">
              Settings
            </button>
            <div className="border-t border-gray-400">
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={login}
          className="px-6 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Login
        </button>
      )}
    </>
  );
}

export default AccountMenu;
