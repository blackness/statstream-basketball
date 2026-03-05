import React from 'react';
import { Home } from 'lucide-react';

const AppHeader = ({ 
  title = "Dashboard",
  isDashboard = false,
  onDashboard,
  userEmail
}) => {
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

          {/* Right: User Info */}
          {userEmail && (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-700 max-w-[120px] truncate">
                  {userEmail}
                </span>
              </div>
              
              <div className="md:hidden w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {userEmail[0].toUpperCase()}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;