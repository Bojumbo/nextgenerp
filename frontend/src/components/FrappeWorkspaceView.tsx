import React from 'react';
import { Home, ExternalLink, Filter, Calendar, MoreHorizontal } from 'lucide-react';

interface FrappeWorkspaceViewProps {
  moduleName: string;
  onNavigateDoctype: (doctypeName: string) => void;
}

export const FrappeWorkspaceView: React.FC<FrappeWorkspaceViewProps> = ({
  moduleName,
  onNavigateDoctype,
}) => {
  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] p-6 overflow-y-auto font-sans">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Home className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{moduleName}</span>
        </div>
        <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Dashboard Chart Card */}
        <div className="frappe-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Completed Projects</h2>
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

          {/* Simple Chart SVG Mock */}
          <div className="h-32 flex items-end justify-between px-4 pt-4 border-b border-slate-100 pb-2 relative">
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400">
              <span>5</span>
              <span>4</span>
              <span>3</span>
              <span>2</span>
              <span>1</span>
            </div>
            <div className="w-full ml-6 border-b border-rose-400 relative h-0 mb-6"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 px-6 font-medium">
            <span>Jul 2025</span>
            <span>Sep 2025</span>
            <span>Nov 2025</span>
            <span>Jan 2026</span>
            <span>Mar 2026</span>
            <span>May 2026</span>
            <span>Jul 2026</span>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Open Projects</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">0</div>
          </div>

          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Non Completed Tasks</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">0</div>
          </div>

          <div className="frappe-card p-4">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Working Hours</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">0.000</div>
          </div>
        </div>

        {/* Reports & Masters Section */}
        <div className="pt-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Reports & Masters</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Core Masters */}
            <div className="frappe-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700">Projects</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div
                  onClick={() => onNavigateDoctype('Project')}
                  className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer font-medium"
                >
                  <span>Project</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div
                  onClick={() => onNavigateDoctype('Task')}
                  className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer font-medium"
                >
                  <span>Task</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <span>Project Template</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <span>Project Type</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="hover:text-blue-600 cursor-pointer">Project Update</div>
              </div>
            </div>

            {/* Column 2: Time Tracking */}
            <div className="frappe-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700">Time Tracking</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer font-medium">
                  <span>Timesheet</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <span>Activity Type</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <span>Activity Cost</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Column 3: Reports */}
            <div className="frappe-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700">Reports</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="hover:text-blue-600 cursor-pointer">Daily Timesheet Summary</div>
                <div className="hover:text-blue-600 cursor-pointer">Project wise Stock Tracking</div>
                <div className="hover:text-blue-600 cursor-pointer">Timesheet Billing Summary</div>
                <div className="hover:text-blue-600 cursor-pointer">Delayed Tasks Summary</div>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="frappe-card p-5 space-y-3 max-w-xs">
            <h3 className="text-xs font-bold text-slate-700">Settings</h3>
            <div className="text-xs text-slate-600">
              <div className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                <span>Projects Settings</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FrappeWorkspaceView;
