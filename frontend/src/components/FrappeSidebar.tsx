import React, { useState } from 'react';
import {
  Home,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  Settings,
  FileBarChart2,
  ChevronRight,
  ChevronDown,
  Search,
  User,
  Sliders,
  Layers,
  Users,
  Briefcase,
  DollarSign,
  FileSpreadsheet,
  Box
} from 'lucide-react';

interface FrappeSidebarProps {
  currentModule: string;
  onSelectModule: (mod: string) => void;
  activeView: string;
  onSelectView: (view: string) => void;
  doctypes: Array<{ name: string; label?: string }>;
  selectedDoctypeName?: string;
  onSelectDoctype: (doctypeName: string) => void;
  userRole: string;
  onRoleChange: (role: string) => void;
  userName?: string;
  userEmail?: string;
}

export const FrappeSidebar: React.FC<FrappeSidebarProps> = ({
  currentModule,
  onSelectModule,
  activeView,
  onSelectView,
  doctypes,
  selectedDoctypeName,
  onSelectDoctype,
  userRole,
  onRoleChange,
  userName = 'Богдан Бродяк',
  userEmail = 'bogdanbrodiak@gmail.com',
}) => {
  const [setupOpen, setSetupOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);

  const modules = [
    { id: 'Projects', name: 'Projects ERPNext', icon: FolderKanban, color: 'bg-blue-500' },
    { id: 'CRM', name: 'CRM ERPNext', icon: Users, color: 'bg-indigo-500' },
    { id: 'Sales', name: 'Selling ERPNext', icon: DollarSign, color: 'bg-emerald-500' },
    { id: 'Stock', name: 'Stock ERPNext', icon: Box, color: 'bg-amber-500' },
    { id: 'Core', name: 'Framework', icon: Layers, color: 'bg-slate-700' },
  ];

  const currentModObj = modules.find((m) => m.id === currentModule) || modules[0];
  const ModIcon = currentModObj.icon;

  return (
    <aside className="w-56 bg-slate-50/70 border-r border-slate-200/80 flex flex-col h-[calc(100vh-3rem)] select-none text-slate-700">
      {/* Top Module Picker Header */}
      <div className="p-3 border-b border-slate-200/60 relative">
        <button
          onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-2xs transition-all border border-transparent hover:border-slate-200/80"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-6 h-6 rounded-md ${currentModObj.color} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
              <ModIcon className="w-3.5 h-3.5" />
            </div>
            <div className="text-left truncate">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate">{currentModObj.name}</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Module Picker Dropdown */}
        {moduleDropdownOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 space-y-0.5">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModule(m.id);
                    setModuleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 text-xs transition-colors ${
                    currentModule === m.id ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded ${m.color} text-white flex items-center justify-center text-[10px]`}>
                    <Icon className="w-2.5 h-2.5" />
                  </div>
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar Search Input */}
      <div className="p-3 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-12 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
          />
          <span className="text-[9px] text-slate-400 font-medium absolute right-2.5 top-2 bg-slate-100 px-1 rounded">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 text-xs font-medium">
        <button
          onClick={() => onSelectView('home')}
          className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeView === 'home'
              ? 'bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/80'
              : 'hover:bg-slate-200/50 text-slate-600'
          }`}
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectView('workspace')}
          className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeView === 'workspace'
              ? 'bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/80'
              : 'hover:bg-slate-200/50 text-slate-600'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        {/* Dynamic DocTypes shortcuts */}
        <div className="pt-2 pb-1">
          <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            DocTypes
          </div>
          {doctypes.map((dt) => (
            <button
              key={dt.name}
              onClick={() => {
                onSelectDoctype(dt.name);
                onSelectView('list');
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                selectedDoctypeName === dt.name && (activeView === 'list' || activeView === 'form')
                  ? 'bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-200/50 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span className="truncate">{dt.label || dt.name}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Schema Builder Link */}
        <button
          onClick={() => onSelectView('schema')}
          className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeView === 'schema'
              ? 'bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/80'
              : 'hover:bg-slate-200/50 text-slate-600'
          }`}
        >
          <Sliders className="w-4 h-4 text-slate-500" />
          <span>DocType Builder</span>
        </button>

        {/* Setup Accordion */}
        <div>
          <button
            onClick={() => setSetupOpen(!setupOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Setup</span>
            </div>
            {setupOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {setupOpen && (
            <div className="pl-9 pr-2 py-1 space-y-1 text-[11px] text-slate-500">
              <div className="hover:text-slate-900 cursor-pointer py-0.5">Workflow Settings</div>
              <div className="hover:text-slate-900 cursor-pointer py-0.5">Custom Fields</div>
            </div>
          )}
        </div>

        {/* Reports Accordion */}
        <div>
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <FileBarChart2 className="w-4 h-4 text-slate-400" />
              <span>Reports</span>
            </div>
            {reportsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {reportsOpen && (
            <div className="pl-9 pr-2 py-1 space-y-1 text-[11px] text-slate-500">
              <div className="hover:text-slate-900 cursor-pointer py-0.5">General Ledger</div>
              <div className="hover:text-slate-900 cursor-pointer py-0.5">Sales Analytics</div>
            </div>
          )}
        </div>
      </div>

      {/* Role Selector & User Profile Footer */}
      <div className="p-3 border-t border-slate-200/60 bg-white/50 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Role:</span>
          <select
            value={userRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 font-semibold rounded px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Guest">Guest</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200/40">
          <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 font-bold text-[10px] flex items-center justify-center shrink-0">
            ББ
          </div>
          <div className="truncate min-w-0">
            <div className="text-[11px] font-semibold text-slate-800 truncate leading-none">{userName}</div>
            <div className="text-[9px] text-slate-400 truncate leading-none mt-0.5">{userEmail}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default FrappeSidebar;
