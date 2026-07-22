import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SchemaManager } from './components/SchemaManager';
import { DocTypeForm } from './components/DocTypeForm';
import { DocInstanceList } from './components/DocInstanceList';
import { erpApi } from './lib/api';
import { Layers, Database, Wrench, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface DocField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  reqd: boolean;
  read_only: boolean;
  hidden: boolean;
}

interface DocType {
  name: string;
  label?: string;
  fields: DocField[];
}

export const App: React.FC = () => {
  const [role, setRole] = useState('Admin');
  const [doctypes, setDoctypes] = useState<DocType[]>([]);
  const [selectedDoctype, setSelectedDoctype] = useState<DocType | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'schema'>('records');
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDocTypes = async () => {
    setLoading(true);
    try {
      const types = await erpApi.getDocTypes(role);
      setDoctypes(types);
      
      // Auto-select first doctype if none selected
      if (types.length > 0) {
        if (!selectedDoctype) {
          setSelectedDoctype(types[0]);
        } else {
          const updated = types.find((t: any) => t.name === selectedDoctype.name);
          setSelectedDoctype(updated || types[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load DocTypes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocTypes();
  }, [role, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setActiveTab('records'); // Ensure tab is records to see the form
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar currentRole={role} setRole={setRole} onRefresh={handleRefresh} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800/80">
              <Layers className="h-4.5 w-4.5 text-brand-500" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Navigation</h2>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('records');
                  setEditingDoc(null);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'records' && !editingDoc
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <FileSpreadsheet className="h-4.5 w-4.5" />
                <span>Documents Registry</span>
              </button>

              <button
                onClick={() => setActiveTab('schema')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'schema'
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Wrench className="h-4.5 w-4.5" />
                <span>Create DocType</span>
              </button>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Database className="h-4.5 w-4.5 text-brand-500" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Schemas</h2>
              </div>
              {loading && <RefreshCw className="h-3.5 w-3.5 text-slate-500 animate-spin" />}
            </div>

            {doctypes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No DocTypes registered.</p>
            ) : (
              <div className="space-y-1">
                {doctypes.map((dt) => (
                  <button
                    key={dt.name}
                    onClick={() => {
                      setSelectedDoctype(dt);
                      setEditingDoc(null);
                      setActiveTab('records');
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      selectedDoctype?.name === dt.name && activeTab === 'records'
                        ? 'bg-slate-800 text-brand-400 border-l-2 border-brand-500 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    {dt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'schema' ? (
            <SchemaManager onSchemaCreated={handleRefresh} />
          ) : (
            selectedDoctype && (
              <>
                <DocTypeForm
                  doctype={selectedDoctype}
                  role={role}
                  existingDoc={editingDoc}
                  onSaveSuccess={handleRefresh}
                />
                
                <DocInstanceList
                  doctype={selectedDoctype}
                  allDocTypes={doctypes}
                  role={role}
                  refreshTrigger={refreshTrigger}
                  onEditDoc={handleEditDoc}
                />
              </>
            )
          )}
        </div>
      </main>
    </div>
  );
};
export default App;
