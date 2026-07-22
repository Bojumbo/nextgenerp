import React from 'react';
import { Search, Bell, Box } from 'lucide-react';

interface FrappeHeaderProps {
  onSearchClick?: () => void;
  onHomeClick?: () => void;
  userInitials?: string;
}

export const FrappeHeader: React.FC<FrappeHeaderProps> = ({
  onSearchClick,
  onHomeClick,
  userInitials = 'ББ',
}) => {
  return (
    <header className="h-12 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: App Switcher / Frappe Logo */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onHomeClick}
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-xs"
          title="Frappe Desk Home"
        >
          <Box className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onSearchClick}
          className="w-full h-8 bg-slate-100/80 hover:bg-slate-100 border border-transparent rounded-lg px-3 flex items-center justify-between text-slate-400 text-xs transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-normal text-slate-500">Search</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Notifications & User Avatar */}
      <div className="flex items-center space-x-3">
        <button
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div
          className="w-7 h-7 rounded-lg bg-red-100 text-red-600 font-semibold text-xs flex items-center justify-center border border-red-200/60 cursor-pointer shadow-2xs"
          title="User Profile"
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
};
export default FrappeHeader;
