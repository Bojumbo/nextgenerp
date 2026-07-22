import React from 'react';
import { Home, ExternalLink, Filter, Calendar, MoreHorizontal, FileSpreadsheet, Plus } from 'lucide-react';

interface ScopedDocType {
  name: string;
  label?: string;
}

interface FrappeWorkspaceViewProps {
  moduleName: string;
  workspaceTitle?: string;
  scopedDoctypes?: ScopedDocType[];
  onNavigateDoctype: (doctypeName: string) => void;
}

export const FrappeWorkspaceView: React.FC<FrappeWorkspaceViewProps> = ({
  moduleName,
  workspaceTitle,
  scopedDoctypes = [],
  onNavigateDoctype,
}) => {
  const displayTitle = workspaceTitle || moduleName;

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] p-6 overflow-y-auto font-sans">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Home className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{displayTitle}</span>
        </div>
        <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Dashboard Chart Card */}
        <div className="frappe-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{displayTitle} Overview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Last synced just now</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Last Year</span>
              </button>
              <button className="flex items-center space-x-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Monthly</span>
              </button>
              <button className="p-1 border border-slate-200 rounded-md text-slate-400 hover:bg-slate-50">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="h-28 bg-slate-50/50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
            <span className="text-xs text-slate-400 font-medium">No chart data yet for {displayTitle}</span>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Total Records</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">0</div>
          </div>
          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Active DocTypes</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">{scopedDoctypes.length}</div>
          </div>
          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Updated</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-sm font-semibold text-slate-900 mt-2">just now</div>
          </div>
        </div>

        {/* DocTypes in this Workspace — Quick Access Links */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">{displayTitle} — Entities</h2>
          </div>

          {scopedDoctypes.length === 0 ? (
            <div className="frappe-card p-8 text-center space-y-3">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No entities in this workspace yet</p>
              <p className="text-xs text-slate-400">
                Use the <strong>DocType Builder</strong> in the sidebar to create entities and assign them to <strong>{displayTitle}</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scopedDoctypes.map((dt) => (
                <div key={dt.name} className="frappe-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700">{dt.label || dt.name}</h3>
                    <button
                      onClick={() => onNavigateDoctype(dt.name)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => onNavigateDoctype(dt.name)}
                    className="w-full text-left text-xs text-slate-600 hover:text-blue-600 font-medium flex items-center space-x-1.5 group"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                    <span>View all {dt.label || dt.name} records</span>
                  </button>
                </div>
              ))}

              {/* Create new DocType shortcut card */}
              <div className="frappe-card p-5 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2 text-center min-h-[100px] cursor-pointer group hover:border-slate-400 transition-colors">
                <Plus className="w-5 h-5 text-slate-300 group-hover:text-slate-600" />
                <span className="text-xs text-slate-400 group-hover:text-slate-700 font-medium">
                  Add entity to {displayTitle}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default FrappeWorkspaceView;
