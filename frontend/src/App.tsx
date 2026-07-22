import React, { useState, useEffect } from 'react';
import { FrappeHeader } from './components/FrappeHeader';
import { FrappeSidebar } from './components/FrappeSidebar';
import { FrappeHomeGrid } from './components/FrappeHomeGrid';
import { FrappeWorkspaceView } from './components/FrappeWorkspaceView';
import { DocTypeForm } from './components/DocTypeForm';
import { DocInstanceList } from './components/DocInstanceList';
import { SchemaManager } from './components/SchemaManager';
import { erpApi } from './lib/api';

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
  const [currentModule, setCurrentModule] = useState('Projects');
  const [activeView, setActiveView] = useState<'home' | 'workspace' | 'list' | 'form' | 'schema'>('home');
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDocTypes = async () => {
    try {
      const types = await erpApi.getDocTypes(role);
      setDoctypes(types);
      if (types.length > 0 && !selectedDoctype) {
        setSelectedDoctype(types[0]);
      }
    } catch (err) {
      console.error('Failed to load DocTypes', err);
    }
  };

  useEffect(() => {
    fetchDocTypes();
  }, [role, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectDoctype = (dtName: string) => {
    const dt = doctypes.find((d) => d.name === dtName);
    if (dt) {
      setSelectedDoctype(dt);
      setEditingDoc(null);
      setActiveView('list');
    }
  };

  const handleEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setActiveView('form');
  };

  const handleCreateNewDoc = () => {
    setEditingDoc(null);
    setActiveView('form');
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <FrappeHeader
        onHomeClick={() => setActiveView('home')}
        onSearchClick={() => {}}
        userInitials="ББ"
      />

      {/* Main Workspace Layout (Sidebar + Content View) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <FrappeSidebar
          currentModule={currentModule}
          onSelectModule={(mod) => {
            setCurrentModule(mod);
            setActiveView('workspace');
          }}
          activeView={activeView}
          onSelectView={(v) => setActiveView(v as any)}
          doctypes={doctypes}
          selectedDoctypeName={selectedDoctype?.name}
          onSelectDoctype={handleSelectDoctype}
          userRole={role}
          onRoleChange={setRole}
        />

        {/* Main Central Workspace Area */}
        <main className="flex-1 overflow-y-auto bg-white">
          {activeView === 'home' && (
            <FrappeHomeGrid
              onSelectModule={(modId) => {
                setCurrentModule(modId);
                setActiveView('workspace');
              }}
            />
          )}

          {activeView === 'workspace' && (
            <FrappeWorkspaceView
              moduleName={currentModule}
              onNavigateDoctype={handleSelectDoctype}
            />
          )}

          {activeView === 'list' && selectedDoctype && (
            <div className="p-6">
              <DocInstanceList
                doctype={selectedDoctype}
                allDocTypes={doctypes}
                role={role}
                refreshTrigger={refreshTrigger}
                onEditDoc={handleEditDoc}
                onCreateNew={handleCreateNewDoc}
              />
            </div>
          )}

          {activeView === 'form' && selectedDoctype && (
            <DocTypeForm
              doctype={selectedDoctype}
              role={role}
              existingDoc={editingDoc}
              onSaveSuccess={handleRefresh}
              onBackToList={() => setActiveView('list')}
            />
          )}

          {activeView === 'schema' && (
            <div className="p-6">
              <SchemaManager onSchemaCreated={handleRefresh} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
