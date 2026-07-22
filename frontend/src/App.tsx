import React, { useState, useEffect } from 'react';
import { FrappeHeader } from './components/FrappeHeader';
import { FrappeSidebar } from './components/FrappeSidebar';
import { FrappeHomeGrid, WorkspaceItem } from './components/FrappeHomeGrid';
import { FrappeWorkspaceView } from './components/FrappeWorkspaceView';
import { DocTypeForm } from './components/DocTypeForm';
import { DocInstanceList } from './components/DocInstanceList';
import { SchemaManager } from './components/SchemaManager';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
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
  module?: string;
  fields: DocField[];
}

// Default built-in workspaces (matching seeded DocType modules)
const DEFAULT_WORKSPACES: WorkspaceItem[] = [
  { id: 'Core', title: 'Framework', iconName: 'Box', bg: 'bg-slate-700 text-white' },
  { id: 'CRM', title: 'CRM ERPNext', iconName: 'Users', bg: 'bg-indigo-600 text-white' },
  { id: 'Accounts', title: 'Accounting', iconName: 'Calculator', bg: 'bg-blue-500 text-white' },
  { id: 'Projects', title: 'Projects', iconName: 'FolderKanban', bg: 'bg-blue-600 text-white' },
  { id: 'Sales', title: 'Selling', iconName: 'Package', bg: 'bg-emerald-600 text-white' },
  { id: 'Stock', title: 'Stock', iconName: 'Boxes', bg: 'bg-amber-600 text-white' },
];

const WORKSPACES_STORAGE_KEY = 'erp_workspaces';

const loadWorkspaces = (): WorkspaceItem[] => {
  try {
    const stored = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as WorkspaceItem[];
    }
  } catch (_) {
    /* ignore */
  }
  return DEFAULT_WORKSPACES;
};

const saveWorkspaces = (ws: WorkspaceItem[]) => {
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(ws));
  } catch (_) {
    /* ignore */
  }
};

export const App: React.FC = () => {
  const [role, setRole] = useState('Admin');
  const [doctypes, setDoctypes] = useState<DocType[]>([]);
  const [selectedDoctype, setSelectedDoctype] = useState<DocType | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(loadWorkspaces);
  const [currentModule, setCurrentModule] = useState('Projects');
  const [activeView, setActiveView] = useState<'home' | 'workspace' | 'list' | 'form' | 'schema'>('home');
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [formDocList, setFormDocList] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

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

  const handleEditDoc = (doc: any, list?: any[]) => {
    setEditingDoc(doc);
    if (list) setFormDocList(list);
    setActiveView('form');
  };

  const handleCreateNewDoc = () => {
    setEditingDoc(null);
    setFormDocList([]);
    setActiveView('form');
  };

  const handleNavigateDoc = (doc: any) => {
    setEditingDoc(doc);
  };

  const handleSelectModule = (modId: string) => {
    setCurrentModule(modId);
    setActiveView('workspace');
    // Auto-select the first DocType in this module so list is ready
    const firstInModule = doctypes.find(
      (d) => d.module?.toLowerCase() === modId.toLowerCase()
    );
    if (firstInModule) {
      setSelectedDoctype(firstInModule);
    }
  };

  const handleCreateWorkspace = (newWs: WorkspaceItem) => {
    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    saveWorkspaces(updated);
    setCurrentModule(newWs.id);
    setActiveView('workspace');
  };

  // Scoped DocTypes for the active module (used by sidebar)
  const scopedDoctypes = doctypes.filter(
    (d) => d.module?.toLowerCase() === currentModule.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <FrappeHeader
        onHomeClick={() => setActiveView('home')}
        onSearchClick={() => {}}
        userInitials="ББ"
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <FrappeSidebar
          currentModule={currentModule}
          onSelectModule={handleSelectModule}
          workspaces={workspaces}
          activeView={activeView}
          onSelectView={(v) => setActiveView(v as any)}
          doctypes={doctypes}
          selectedDoctypeName={selectedDoctype?.name}
          onSelectDoctype={handleSelectDoctype}
          onOpenCreateWorkspaceModal={() => setShowCreateWorkspace(true)}
          userRole={role}
          onRoleChange={setRole}
        />

        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto bg-white">
          {activeView === 'home' && (
            <FrappeHomeGrid
              workspaces={workspaces}
              onSelectModule={handleSelectModule}
              onOpenCreateModal={() => setShowCreateWorkspace(true)}
            />
          )}

          {activeView === 'workspace' && (
            <FrappeWorkspaceView
              moduleName={currentModule}
              workspaceTitle={
                workspaces.find(
                  (w) => w.id.toLowerCase() === currentModule.toLowerCase()
                )?.title || currentModule
              }
              scopedDoctypes={scopedDoctypes}
              onNavigateDoctype={handleSelectDoctype}
            />
          )}

          {activeView === 'list' && selectedDoctype && (
            <div className="p-6 w-full h-full">
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
              allDoctypes={doctypes}
              docList={formDocList}
              onSaveSuccess={handleRefresh}
              onBackToList={() => setActiveView('list')}
              onNavigateDoc={handleNavigateDoc}
              onCreateNew={handleCreateNewDoc}
            />
          )}

          {activeView === 'schema' && (
            <div className="p-6">
              <SchemaManager
                onSchemaCreated={handleRefresh}
                workspaces={workspaces}
                defaultModule={currentModule}
              />
            </div>
          )}
        </main>
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
};
export default App;
