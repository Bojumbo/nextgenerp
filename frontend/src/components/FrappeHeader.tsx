import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Box, X, FileText, Settings, ChevronRight, LogOut, User } from 'lucide-react';

interface FrappeHeaderProps {
  onSearchClick?: () => void;
  onHomeClick?: () => void;
  userInitials?: string;
  userName?: string;
  userEmail?: string;
}

const QUICK_LINKS = [
  { label: 'Contact', icon: FileText },
  { label: 'Lead', icon: FileText },
  { label: 'CRM Deal', icon: FileText },
  { label: 'Settings', icon: Settings },
];

export const FrappeHeader: React.FC<FrappeHeaderProps> = ({
  onSearchClick,
  onHomeClick,
  userInitials = 'ББ',
  userName = 'Богдан Бродяк',
  userEmail = 'bogdanbrodiak@gmail.com',
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications] = useState([
    { id: 1, text: 'New Lead assigned to you', time: '2m ago', read: false },
    { id: 2, text: 'Contact CNT-003 was updated', time: '1h ago', read: false },
    { id: 3, text: 'System backup completed', time: '3h ago', read: true },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [showSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredLinks = QUICK_LINKS.filter((l) =>
    !searchQuery || l.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="h-12 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left: App Switcher */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onHomeClick}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-xs"
            title="Frappe Desk Home"
          >
            <Box className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Center: Search Bar (triggers overlay) */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setShowSearch(true)}
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

        {/* Right: Notifications & User */}
        <div className="flex items-center space-x-2">
          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Notifications</span>
                  <span className="text-[10px] text-blue-600 font-medium cursor-pointer hover:underline">Mark all read</span>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 text-xs border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex items-start space-x-2 ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />}
                    <div className={n.read ? 'ml-[14px]' : ''}>
                      <p className="text-slate-700 font-medium leading-tight">{n.text}</p>
                      <p className="text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2.5 text-center text-xs text-blue-600 font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                  See all notifications
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="w-7 h-7 rounded-lg bg-red-100 text-red-600 font-semibold text-xs flex items-center justify-center border border-red-200/60 cursor-pointer shadow-2xs hover:ring-2 hover:ring-red-300 transition-all"
              title="User Profile"
            >
              {userInitials}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800">{userName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{userEmail}</div>
                </div>
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => { setShowProfile(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center space-x-2 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Overlay (Spotlight) */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-start justify-center pt-24 px-4"
          onClick={() => { setShowSearch(false); setSearchQuery(''); }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input row */}
            <div className="flex items-center px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search DocTypes, records, settings..."
                className="flex-1 mx-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {filteredLinks.length > 0 ? (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Links
                  </div>
                  {filteredLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => { setShowSearch(false); setSearchQuery(''); onSearchClick?.(); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">
                  No results for "<span className="font-semibold">{searchQuery}</span>"
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-slate-100 px-4 py-2 flex items-center space-x-3 text-[10px] text-slate-400">
              <span><kbd className="bg-slate-100 px-1 rounded">↵</kbd> to open</span>
              <span><kbd className="bg-slate-100 px-1 rounded">↑↓</kbd> to navigate</span>
              <span><kbd className="bg-slate-100 px-1 rounded">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default FrappeHeader;
