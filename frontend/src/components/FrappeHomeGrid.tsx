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
  Users,
  Plus
} from 'lucide-react';

export interface WorkspaceItem {
  id: string;
  title: string;
  iconName: string;
  bg: string;
}

interface FrappeHomeGridProps {
  workspaces: WorkspaceItem[];
  onSelectModule: (modId: string) => void;
  onOpenCreateModal: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
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
  Users,
};

export const FrappeHomeGrid: React.FC<FrappeHomeGridProps> = ({
  workspaces,
  onSelectModule,
  onOpenCreateModal,
}) => {
  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] p-8 flex items-start justify-center pt-16 font-sans">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-10 gap-x-6">
          {workspaces.map((ws) => {
            const IconComponent = ICON_MAP[ws.iconName] || FolderKanban;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectModule(ws.id)}
                className="flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${ws.bg} flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:shadow-md`}
                >
                  <IconComponent className="w-7 h-7 stroke-[1.75]" />
                </div>
                <span className="mt-3 text-xs font-semibold text-slate-800 text-center truncate max-w-[100px]">
                  {ws.title}
                </span>
              </button>
            );
          })}

          {/* Add New Page Button Card */}
          <button
            onClick={onOpenCreateModal}
            className="flex flex-col items-center group cursor-pointer focus:outline-none"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all duration-200 group-hover:scale-105">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="mt-3 text-xs font-medium text-slate-500 group-hover:text-slate-800 text-center truncate">
              Create Page
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default FrappeHomeGrid;
