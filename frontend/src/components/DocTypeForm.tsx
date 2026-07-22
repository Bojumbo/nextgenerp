import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Paperclip,
  UserPlus,
  Tag,
  Share2,
  CheckCircle2,
  Link as LinkIcon,
  Clock,
  Send,
  Trash2,
  Copy,
  Printer,
  X,
  AlertTriangle
} from 'lucide-react';
import { erpApi } from '../lib/api';

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

interface DocInstance {
  id: string;
  name: string;
  data: Record<string, any>;
}

interface DocTypeFormProps {
  doctype: DocType;
  role: string;
  existingDoc?: DocInstance | null;
  allDoctypes?: DocType[];
  docList?: DocInstance[];
  onSaveSuccess: () => void;
  onBackToList?: () => void;
  onNavigateDoc?: (doc: DocInstance) => void;
  onCreateNew?: () => void;
}

export const DocTypeForm: React.FC<DocTypeFormProps> = ({
  doctype,
  role,
  existingDoc,
  allDoctypes = [],
  docList = [],
  onSaveSuccess,
  onBackToList,
  onNavigateDoc,
  onCreateNew,
}) => {
  const [docName, setDocName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'notes' | 'connections'>('details');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Saved');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown menus
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Sidebar expandable panels
  const [assignPanel, setAssignPanel] = useState(false);
  const [tagsPanel, setTagsPanel] = useState(false);
  const [attachmentsPanel, setAttachmentsPanel] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assignInput, setAssignInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Notes
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<{ text: string; ts: string }[]>([]);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Connections
  const [relations, setRelations] = useState<any[]>([]);
  const [newRelTargetType, setNewRelTargetType] = useState('');
  const [newRelTargetId, setNewRelTargetId] = useState('');
  const [targetDocs, setTargetDocs] = useState<string[]>([]);
  const [relError, setRelError] = useState('');

  const createMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false);
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setShowActionMenu(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load existing doc or defaults
  useEffect(() => {
    if (existingDoc) {
      setDocName(existingDoc.name);
      setFormData(existingDoc.data || {});
      loadRelations(existingDoc.name);
    } else {
      setDocName('');
      const defaultData: Record<string, any> = {};
      doctype.fields.forEach((f) => {
        defaultData[f.fieldname] = f.fieldtype === 'Check' ? false : '';
      });
      setFormData(defaultData);
      setRelations([]);
    }
    setError('');
    setNotes([]);
    setAssignedTo([]);
    setTags([]);
  }, [doctype, existingDoc]);

  // Load link field options
  useEffect(() => {
    const fetchLinkOptions = async () => {
      const links = doctype.fields.filter((f) => f.fieldtype === 'Link' && f.options);
      const optionsMap: Record<string, string[]> = {};
      for (const link of links) {
        try {
          const docs = await erpApi.getDocuments(link.options!, role);
          optionsMap[link.fieldname] = docs.map((d: any) => d.name);
        } catch {
          optionsMap[link.fieldname] = [];
        }
      }
      setLinkOptions(optionsMap);
    };
    fetchLinkOptions();
  }, [doctype, role]);

  // Load target docs for connection form
  useEffect(() => {
    const fetchTargetDocs = async () => {
      if (!newRelTargetType) { setTargetDocs([]); return; }
      try {
        const docs = await erpApi.getDocuments(newRelTargetType, role);
        setTargetDocs(docs.map((d: any) => d.name));
      } catch {
        setTargetDocs([]);
      }
    };
    fetchTargetDocs();
  }, [newRelTargetType, role]);

  const loadRelations = async (name: string) => {
    try {
      const rels = await erpApi.getRelations(doctype.name, name);
      setRelations(rels);
    } catch {
      /* ignore */
    }
  };

  const handleChange = (fieldname: string, val: any) => {
    setFormData({ ...formData, [fieldname]: val });
  };

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsSaving(true);

    const nameToSave = existingDoc
      ? existingDoc.name
      : docName || `${doctype.name.toUpperCase()}-${Date.now().toString().slice(-4)}`;

    try {
      if (existingDoc) {
        await erpApi.updateDocument(doctype.name, existingDoc.name, formData, role);
        triggerToast('Saved');
      } else {
        await erpApi.createDocument(doctype.name, nameToSave, formData, role);
        setDocName(nameToSave);
        triggerToast('Created successfully');
      }
      onSaveSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save document';
      setError(msg);
      triggerToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingDoc) return;
    try {
      await erpApi.deleteDocument(doctype.name, existingDoc.name, role);
      triggerToast('Document deleted');
      setTimeout(() => onBackToList?.(), 800);
    } catch (err: any) {
      triggerToast(err.response?.data?.detail || 'Failed to delete', 'error');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDuplicate = async () => {
    if (!existingDoc) return;
    setShowActionMenu(false);
    const newName = `${existingDoc.name}-COPY-${Date.now().toString().slice(-3)}`;
    try {
      await erpApi.createDocument(doctype.name, newName, formData, role);
      triggerToast(`Duplicated as ${newName}`);
      onSaveSuccess();
    } catch (err: any) {
      triggerToast(err.response?.data?.detail || 'Failed to duplicate', 'error');
    }
  };

  const handlePrintPdf = async () => {
    setShowActionMenu(false);
    if (!existingDoc) { triggerToast('Save the document first before printing', 'error'); return; }
    try {
      const pdfBlob = await erpApi.printPdf(doctype.name, existingDoc.name);
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err: any) {
      triggerToast(err.response?.data?.detail || 'PDF unavailable', 'error');
    }
  };

  const handleCopyLink = () => {
    setShowMoreMenu(false);
    const url = `${window.location.origin}/${doctype.name}/${docName}`;
    navigator.clipboard.writeText(url).then(() => triggerToast('Link copied to clipboard'));
  };

  // Prev / Next navigation within docList
  const currentIndex = docList.findIndex((d) => d.name === existingDoc?.name);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < docList.length - 1;

  const handlePrev = () => {
    if (canPrev && onNavigateDoc) onNavigateDoc(docList[currentIndex - 1]);
  };
  const handleNext = () => {
    if (canNext && onNavigateDoc) onNavigateDoc(docList[currentIndex + 1]);
  };

  // Add Note
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    setNotes([{ text: noteText.trim(), ts: new Date().toLocaleTimeString() }, ...notes]);
    setNoteText('');
    triggerToast('Note added');
  };

  // Assign
  const handleAssign = () => {
    if (!assignInput.trim()) return;
    setAssignedTo([...assignedTo, assignInput.trim()]);
    setAssignInput('');
  };

  // Tags
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  // Connections
  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRelError('');
    if (!docName || !newRelTargetType || !newRelTargetId) {
      setRelError('Please select target DocType and record');
      return;
    }
    try {
      await erpApi.createRelation(doctype.name, docName, newRelTargetType, newRelTargetId, 'Connection');
      await loadRelations(docName);
      setNewRelTargetId('');
      triggerToast('Connection created');
    } catch (err: any) {
      setRelError(err.response?.data?.detail || 'Failed to link relation');
    }
  };

  const primaryFields = doctype.fields.filter((f) => !f.hidden || role === 'Admin');

  // All available doctypes for connections dropdown (from allDoctypes prop)
  const availableConnTypes = allDoctypes.map((d) => d.name).filter((n) => n !== doctype.name);

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] flex flex-col font-sans relative">
      {/* ── 1. Top Action Header ── */}
      <div className="h-12 border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 bg-white z-20">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600">
          <Home className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={onBackToList} />
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 hover:text-slate-900 cursor-pointer font-medium" onClick={onBackToList}>
            {doctype.name}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[150px]">{docName || 'New'}</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200/60 ml-1">
            {doctype.name}
          </span>
          {existingDoc && docList.length > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              {currentIndex + 1} / {docList.length}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Create dropdown */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => { setShowCreateMenu(!showCreateMenu); setShowActionMenu(false); setShowMoreMenu(false); }}
              className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1 border border-slate-200/60"
            >
              <span>Create</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs">
                <button
                  onClick={() => { setShowCreateMenu(false); onCreateNew?.(); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center space-x-2"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>New {doctype.name}</span>
                </button>
              </div>
            )}
          </div>

          {/* Action dropdown */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => { setShowActionMenu(!showActionMenu); setShowCreateMenu(false); setShowMoreMenu(false); }}
              className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1 border border-slate-200/60"
            >
              <span>Action</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showActionMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs">
                <button
                  onClick={handleDuplicate}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center space-x-2"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center space-x-2"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Print / PDF</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setShowActionMenu(false); setShowDeleteConfirm(true); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-500 flex items-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center space-x-1 border-l border-r border-slate-200/80 px-1">
            <button
              onClick={handlePrev}
              disabled={!canPrev}
              title="Previous record"
              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext}
              title="Next record"
              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* More (...) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => { setShowMoreMenu(!showMoreMenu); setShowCreateMenu(false); setShowActionMenu(false); }}
              className="p-1 hover:bg-slate-100 rounded text-slate-500"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs">
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center space-x-2"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); setActiveTab('connections'); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center space-x-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Connections</span>
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="h-8 px-4 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Tabs ── */}
      <div className="border-b border-slate-200/80 px-6 flex items-center space-x-6 text-xs font-medium text-slate-600 bg-white">
        {(['details', 'activities', 'notes', 'connections'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === tab
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="capitalize">{tab}</span>
            {tab === 'connections' && relations.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 rounded-full border border-slate-200">
                {relations.length}
              </span>
            )}
            {tab === 'notes' && notes.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 rounded-full border border-slate-200">
                {notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 3. Body: Form + Right Sidebar ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Form Area */}
        <div className="flex-1 p-6 overflow-y-auto pr-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
              <div className="max-w-md">
                <label className="block text-xs font-medium text-slate-500 mb-1">Document ID / Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  disabled={!!existingDoc}
                  placeholder={`e.g. ${doctype.name.toUpperCase()}-0001`}
                  className="frappe-input w-full disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
                {primaryFields.map((field) => {
                  const isReadOnly = field.read_only && role !== 'Admin';
                  return (
                    <div key={field.fieldname} className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600 flex items-center justify-between">
                        <span>
                          {field.label || field.fieldname}
                          {field.reqd && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                        {field.hidden && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                            Hidden
                          </span>
                        )}
                      </label>

                      {field.fieldtype === 'Check' ? (
                        <div className="flex items-center h-9">
                          <input
                            type="checkbox"
                            checked={!!formData[field.fieldname]}
                            onChange={(e) => handleChange(field.fieldname, e.target.checked)}
                            disabled={isReadOnly}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-4 w-4 cursor-pointer"
                          />
                        </div>
                      ) : field.fieldtype === 'Select' ? (
                        <div className="relative">
                          <select
                            value={formData[field.fieldname] || ''}
                            onChange={(e) => handleChange(field.fieldname, e.target.value)}
                            disabled={isReadOnly}
                            className="frappe-input w-full appearance-none pr-8 cursor-pointer"
                          >
                            <option value="">Select option...</option>
                            {(field.options || '').split(',').map((opt) => opt.trim()).filter(Boolean).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                        </div>
                      ) : field.fieldtype === 'Link' ? (
                        <div className="relative">
                          <select
                            value={formData[field.fieldname] || ''}
                            onChange={(e) => handleChange(field.fieldname, e.target.value)}
                            disabled={isReadOnly}
                            className="frappe-input w-full appearance-none pr-8 cursor-pointer"
                          >
                            <option value="">Select {field.options}...</option>
                            {(linkOptions[field.fieldname] || []).map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={['Float', 'Int'].includes(field.fieldtype) ? 'number' : 'text'}
                          step={field.fieldtype === 'Float' ? '0.01' : '1'}
                          value={formData[field.fieldname] ?? ''}
                          onChange={(e) => handleChange(field.fieldname, e.target.value)}
                          disabled={isReadOnly}
                          placeholder={field.label}
                          className="frappe-input w-full"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </form>
          )}

          {/* CONNECTIONS TAB */}
          {activeTab === 'connections' && (
            <div className="space-y-6 max-w-4xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Connected DocTypes</h3>

              {/* Connection type cards */}
              {availableConnTypes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {availableConnTypes.map((connType) => {
                    const count = relations.filter(
                      (r) => r.target_type === connType || r.source_type === connType
                    ).length;
                    return (
                      <div
                        key={connType}
                        className="frappe-card p-3 flex items-center justify-between border border-slate-200/80 hover:border-slate-300 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-700">{connType}</span>
                        <div className="flex items-center space-x-1">
                          {count > 0 && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">
                              {count}
                            </span>
                          )}
                          <button
                            onClick={() => setNewRelTargetType(connType)}
                            className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active connections list */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 mb-3">Linked Connections</h4>
                {relations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No active connections yet.</p>
                ) : (
                  <div className="space-y-2">
                    {relations.map((rel) => {
                      const isParent = rel.source_id === docName;
                      const connectedType = isParent ? rel.target_type : rel.source_type;
                      const connectedId = isParent ? rel.target_id : rel.source_id;
                      return (
                        <div key={rel.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{connectedId}</span>
                            <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {connectedType}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{rel.relation_type}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add connection form */}
              <form onSubmit={handleAddRelation} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Add New Connection</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Target DocType</label>
                    <select
                      value={newRelTargetType}
                      onChange={(e) => setNewRelTargetType(e.target.value)}
                      className="frappe-input w-full"
                    >
                      <option value="">Select DocType...</option>
                      {availableConnTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Target Record</label>
                    <select
                      value={newRelTargetId}
                      onChange={(e) => setNewRelTargetId(e.target.value)}
                      disabled={!newRelTargetType}
                      className="frappe-input w-full disabled:opacity-50"
                    >
                      <option value="">Select Record...</option>
                      {targetDocs.map((td) => (
                        <option key={td} value={td}>{td}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {relError && <p className="text-xs text-red-500">{relError}</p>}
                <button type="submit" className="frappe-btn frappe-btn-primary text-xs flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bind Connection</span>
                </button>
              </form>
            </div>
          )}

          {/* ACTIVITIES TAB */}
          {activeTab === 'activities' && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Log</h3>
              <div className="space-y-2">
                {existingDoc ? (
                  <>
                    <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Document <strong>{existingDoc.name}</strong> last updated.</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Document created in <strong>{doctype.name}</strong>.</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">No activity yet. Save the document first.</p>
                )}
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notes & Comments</h3>

              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a private note..."
                  rows={3}
                  className="frappe-input w-full resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="frappe-btn frappe-btn-secondary text-xs flex items-center space-x-1 disabled:opacity-50"
                >
                  <Send className="w-3 h-3 text-slate-500" />
                  <span>Add Note</span>
                </button>
              </div>

              {notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {notes.map((note, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">You</span>
                        <span className="text-[10px] text-slate-400">{note.ts}</span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Document Sidebar ── */}
        <aside className="w-64 border-l border-slate-200/80 p-5 bg-white space-y-5 text-xs select-none overflow-y-auto">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xl flex items-center justify-center border border-slate-200/80 shadow-2xs mb-2">
              {(docName || doctype.name)[0].toUpperCase()}
            </div>
            <div className="font-semibold text-slate-900 text-sm truncate max-w-full">{docName || 'Untitled'}</div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {docName ? `${doctype.name.toUpperCase()}-${docName}` : 'Draft'}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-1 border-b border-slate-100 pb-4">
            {/* Assign */}
            <button
              onClick={() => setAssignPanel(!assignPanel)}
              className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <div className="flex items-center space-x-2">
                <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Assign</span>
                {assignedTo.length > 0 && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 rounded-full font-bold">
                    {assignedTo.length}
                  </span>
                )}
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {assignPanel && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-2 mt-1">
                {assignedTo.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{u}</span>
                    <button onClick={() => setAssignedTo(assignedTo.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={assignInput}
                    onChange={(e) => setAssignInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAssign(); }}}
                    placeholder="Name or email..."
                    className="frappe-input flex-1 text-[11px] py-1"
                  />
                  <button onClick={handleAssign} className="p-1 bg-slate-900 text-white rounded hover:bg-black">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Tags */}
            <button
              onClick={() => setTagsPanel(!tagsPanel)}
              className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Tags</span>
                {tags.length > 0 && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 rounded-full font-bold">
                    {tags.length}
                  </span>
                )}
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {tagsPanel && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-2 mt-1">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, i) => (
                    <span key={i} className="flex items-center space-x-1 bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                      <span>{tag}</span>
                      <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                    placeholder="Add tag..."
                    className="frappe-input flex-1 text-[11px] py-1"
                  />
                  <button onClick={handleAddTag} className="p-1 bg-slate-900 text-white rounded hover:bg-black">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Attachments */}
            <button
              onClick={() => setAttachmentsPanel(!attachmentsPanel)}
              className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Attachments</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {attachmentsPanel && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                <label className="flex flex-col items-center py-3 cursor-pointer border border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors">
                  <Paperclip className="w-5 h-5 text-slate-300 mb-1" />
                  <span className="text-[11px] text-slate-400">Click to attach file</span>
                  <input type="file" className="hidden" onChange={() => triggerToast('Attachment upload requires backend integration')} />
                </label>
              </div>
            )}

            {/* Share */}
            <button
              onClick={() => { handleCopyLink(); }}
              className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Share</span>
              </div>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Document Metadata */}
          <div className="space-y-3 text-[11px]">
            <div>
              <div className="text-slate-400 font-medium">Last Edited</div>
              <div className="text-slate-700 font-semibold mt-0.5">just now</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Created By</div>
              <div className="text-slate-700 font-semibold mt-0.5">You</div>
            </div>
            {existingDoc && (
              <div>
                <div className="text-slate-400 font-medium">Document ID</div>
                <div className="text-slate-700 font-semibold mt-0.5 font-mono">{existingDoc.name}</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Toast ── */}
      {showToast && (
        <div className={`fixed bottom-6 right-6 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-2 z-50 ${
          toastType === 'success'
            ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
            : 'bg-red-100/90 text-red-900 border border-red-300'
        }`}>
          {toastType === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            : <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete {doctype.name}?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Document <strong>{existingDoc?.name}</strong> will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="frappe-btn frappe-btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 frappe-btn text-xs bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg py-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DocTypeForm;
