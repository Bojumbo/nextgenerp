import React from 'react';
import {
  Box,
  Building2,
  Calculator,
  Layers,
  ShoppingBag,
  Factory,
  FolderKanban,
  ShieldCheck,
  Package,
  Boxes,
  RefreshCw,
  Settings,
  Users
} from 'lucide-react';

interface FrappeHomeGridProps {
  onSelectModule: (modId: string) => void;
}

export const FrappeHomeGrid: React.FC<FrappeHomeGridProps> = ({ onSelectModule }) => {
  const workspaces = [
    { id: 'Core', title: 'Framework', icon: Box, bg: 'bg-slate-700 text-white' },
    { id: 'CRM', title: 'Organization', icon: Building2, bg: 'bg-blue-600 text-white' },
    { id: 'Accounts', title: 'Accounting', icon: Calculator, bg: 'bg-blue-500 text-white' },
    { id: 'Assets', title: 'Assets', icon: Layers, bg: 'bg-blue-600 text-white' },
    { id: 'Buying', title: 'Buying', icon: ShoppingBag, bg: 'bg-blue-600 text-white' },
    { id: 'Manufacturing', title: 'Manufacturing', icon: Factory, bg: 'bg-blue-600 text-white' },
    { id: 'Projects', title: 'Projects', icon: FolderKanban, bg: 'bg-blue-600 text-white' },
    { id: 'Quality', title: 'Quality', icon: ShieldCheck, bg: 'bg-blue-600 text-white' },
    { id: 'Sales', title: 'Selling', icon: Package, bg: 'bg-blue-600 text-white' },
    { id: 'Stock', title: 'Stock', icon: Boxes, bg: 'bg-blue-600 text-white' },
    { id: 'Subcontracting', title: 'Subcontracting', icon: RefreshCw, bg: 'bg-blue-600 text-white' },
    { id: 'Settings', title: 'ERPNext Settings', icon: Settings, bg: 'bg-blue-600 text-white' },
  ];

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] p-8 flex items-start justify-center pt-16">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-10 gap-x-6">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectModule(ws.id)}
                className="flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${ws.bg} flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:shadow-md`}
                >
                  <Icon className="w-7 h-7 stroke-[1.75]" />
                </div>
                <span className="mt-3 text-xs font-semibold text-slate-800 text-center truncate max-w-[100px]">
                  {ws.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default FrappeHomeGrid;
