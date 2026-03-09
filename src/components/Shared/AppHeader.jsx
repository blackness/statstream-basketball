import React, { useState, useRef, useEffect } from 'react';
import { Home, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '../../../supabase';

const AppHeader = ({ 
  title = "Dashboard",
  isDashboard = false,
  onDashboard,
  userEmail
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
  };
  return (
    <header className="w-full bg-white border-b-2 border-gray-200 flex-shrink-0">
      <div className="w-full px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Logo + Dashboard Button */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <button
              onClick={onDashboard}
              disabled={isDashboard}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:cursor-default"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="14" width="3" height="7" rx="1" fill="white"/>
                  <rect x="8" y="11" width="3" height="10" rx="1" fill="white"/>
                  <rect x="13" y="8" width="3" height="13" rx="1" fill="white"/>
                  <rect x="18" y="5" width="3" height="16" rx="1" fill="white"/>
                </svg>
              </div>
              <span className="font-black text-xl text-gray-900 hidden sm:block whitespace-nowrap">
                Stat<span className="text-blue-600">Stream</span>
              </span>
            </button>
            
            {/* Dashboard Button */}
            {!isDashboard && (
              <button
                onClick={onDashboard}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95 transition-all whitespace-nowrap"
              >
                <Home size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}
          </div>

          {/* Center: Title */}
          <h1 className="flex-1 text-center text-lg sm:text-xl font-black text-gray-900 truncate">
            {title}
          </h1>

          {/* Right: User dropdown */}
          {userEmail && (
            <div className="relative" ref={dropdownRef}>
              {/* Desktop trigger */}
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
              >
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-700 max-w-[120px] truncate">
                  {userEmail}
                </span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile trigger */}
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="md:hidden w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              >
                {userEmail[0].toUpperCase()}
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <>
                  {/* Backdrop for mobile */}
                  <div 
                    className="fixed inset-0 z-40 md:hidden" 
                    onClick={() => setDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Signed in as</p>
                      <p className="text-xs font-bold text-gray-900 break-all mt-0.5">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;