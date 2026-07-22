import React from 'react';
import { Shield, User, Layers, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentRole: string;
  setRole: (role: string) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, setRole, onRefresh }) => {
  return (
    <header className="glass-panel sticky top-0 z-50 w-full border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/30">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ERP NextGen
          </h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">Metadata Engine</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button
          onClick={onRefresh}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 glass-card px-4 py-1.5 rounded-full border border-slate-800">
          <Shield className="h-4 w-4 text-brand-500" />
          <span className="text-xs text-slate-400">Current Role:</span>
          <select
            value={currentRole}
            onChange={(e) => setRole(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="Admin" className="bg-slate-900 text-white">Admin (Full Access)</option>
            <option value="Manager" className="bg-slate-900 text-white">Manager (Restricted)</option>
            <option value="Guest" className="bg-slate-900 text-white">Guest (Read Only)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold text-sm border border-slate-700">
            <User className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium hidden md:inline text-slate-300">System Operator</span>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
