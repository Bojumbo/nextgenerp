import React, { useState, useEffect } from 'react';
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
  FileText
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

interface DocTypeFormProps {
  doctype: DocType;
  role: string;
  existingDoc?: { name: string; data: Record<string, any> } | null;
  onSaveSuccess: () => void;
  onBackToList?: () => void;
}

export const DocTypeForm: React.FC<DocTypeFormProps> = ({
  doctype,
  role,
  existingDoc,
  onSaveSuccess,
  onBackToList
}) => {
  const [docName, setDocName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'notes' | 'connections'>('details');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Saved');
  const [isSaving, setIsSaving] = useState(false);

  // Connections state
  const [relations, setRelations] = useState<any[]>([]);
  const [newRelTargetType, setNewRelTargetType] = useState('');
  const [newRelTargetId, setNewRelTargetId] = useState('');
  const [targetDocs, setTargetDocs] = useState<string[]>([]);
  const [relError, setRelError] = useState('');

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
        if (f.fieldtype === 'Check') {
          defaultData[f.fieldname] = false;
        } else {
          defaultData[f.fieldname] = '';
        }
      });
      setFormData(defaultData);
      setRelations([]);
    }
    setError('');
  }, [doctype, existingDoc]);

  // Load link field dropdown options
  useEffect(() => {
    const fetchLinkOptions = async () => {
      const links = doctype.fields.filter((f) => f.fieldtype === 'Link' && f.options);
      const optionsMap: Record<string, string[]> = {};

      for (let link of links) {
        try {
          const docs = await erpApi.getDocuments(link.options!, role);
          optionsMap[link.fieldname] = docs.map((d: any) => d.name);
        } catch (err) {
          optionsMap[link.fieldname] = [];
        }
      }
      setLinkOptions(optionsMap);
    };

    fetchLinkOptions();
  }, [doctype, role]);

  const loadRelations = async (name: string) => {
    try {
      const rels = await erpApi.getRelations(doctype.name, name);
      setRelations(rels);
    } catch (err) {
      console.error('Failed to load relations', err);
    }
  };

  useEffect(() => {
    const fetchTargetDocs = async () => {
      if (!newRelTargetType) {
        setTargetDocs([]);
        return;
      }
      try {
        const docs = await erpApi.getDocuments(newRelTargetType, role);
        setTargetDocs(docs.map((d: any) => d.name));
      } catch (err) {
        setTargetDocs([]);
      }
    };
    fetchTargetDocs();
  }, [newRelTargetType, role]);

  const handleChange = (fieldname: string, val: any) => {
    setFormData({
      ...formData,
      [fieldname]: val,
    });
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsSaving(true);

    const nameToSave = existingDoc ? existingDoc.name : (docName || `${doctype.name.toUpperCase()}-${Date.now().toString().slice(-4)}`);

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
      setError(err.response?.data?.detail || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRelError('');
    if (!docName || !newRelTargetType || !newRelTargetId) {
      setRelError('Please select target DocType and record');
      return;
    }

    try {
      await erpApi.createRelation(
        doctype.name,
        docName,
        newRelTargetType,
        newRelTargetId,
        'Connection'
      );
      await loadRelations(docName);
      setNewRelTargetId('');
      triggerToast('Connection created');
    } catch (err: any) {
      setRelError(err.response?.data?.detail || 'Failed to link relation');
    }
  };

  // Group fields into 2-3 logical columns or sections
  const primaryFields = doctype.fields.filter((f) => !f.hidden || role === 'Admin');

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-3rem)] flex flex-col font-sans relative">
      {/* 1. Top Action Header */}
      <div className="h-12 border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 bg-white z-20">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600">
          <Home
            className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            onClick={onBackToList}
          />
          <span className="text-slate-300">/</span>
          <span
            className="text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
            onClick={onBackToList}
          >
            {doctype.name}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[150px]">
            {docName || 'New'}
          </span>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200/60 ml-1">
            {doctype.name}
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2">
          <button className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1 border border-slate-200/60">
            <span>Create</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1 border border-slate-200/60">
            <span>Action</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <div className="flex items-center space-x-1 border-l border-r border-slate-200/80 px-1">
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="h-8 px-4 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* 2. Sub Header Tabs */}
      <div className="border-b border-slate-200/80 px-6 flex items-center space-x-6 text-xs font-medium text-slate-600 bg-white">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'details'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Details
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'activities'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Activities
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Notes
        </button>

        <button
          onClick={() => setActiveTab('connections')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'connections'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Connections</span>
          {relations.length > 0 && (
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-slate-200">
              {relations.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Main Form Body Grid (Left Form Area + Right Document Sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center Form Content Area */}
        <div className="flex-1 p-6 overflow-y-auto pr-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
              {/* Name / ID Input */}
              <div className="max-w-md">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Document ID / Name
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  disabled={!!existingDoc}
                  placeholder={`e.g. ${doctype.name.toUpperCase()}-0001`}
                  className="frappe-input w-full disabled:opacity-60"
                />
              </div>

              {/* Dynamic Field Inputs Grid */}
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
                            {(field.options || '')
                              .split(',')
                              .map((opt) => opt.trim())
                              .filter(Boolean)
                              .map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
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
                              <option key={name} value={name}>
                                {name}
                              </option>
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

          {activeTab === 'connections' && (
            <div className="space-y-6 max-w-4xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Connected DocTypes</h3>

              {/* Standard Connections Pill Cards (Screenshot 4 style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Opportunity', 'Quotation', 'Prospect', 'PaymentEntry', 'Invoice', 'Contract'].map(
                  (connType) => {
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
                            onClick={() => {
                              setNewRelTargetType(connType);
                            }}
                            className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Active Connections List */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 mb-3">Linked Connections List</h4>
                {relations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No active connections bound yet.</p>
                ) : (
                  <div className="space-y-2">
                    {relations.map((rel) => {
                      const isParent = rel.source_id === docName;
                      const connectedType = isParent ? rel.target_type : rel.source_type;
                      const connectedId = isParent ? rel.target_id : rel.source_id;
                      return (
                        <div
                          key={rel.id}
                          className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                        >
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

              {/* Add New Connection Form */}
              <form
                onSubmit={handleAddRelation}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 pt-3"
              >
                <h4 className="text-xs font-bold text-slate-700">Add New Connection</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Target DocType
                    </label>
                    <select
                      value={newRelTargetType}
                      onChange={(e) => setNewRelTargetType(e.target.value)}
                      className="frappe-input w-full"
                    >
                      <option value="">Select DocType...</option>
                      {['Opportunity', 'Quotation', 'Prospect', 'PaymentEntry', 'Invoice', 'Contract', 'Contact'].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Target Record ID
                    </label>
                    <select
                      value={newRelTargetId}
                      onChange={(e) => setNewRelTargetId(e.target.value)}
                      disabled={!newRelTargetType}
                      className="frappe-input w-full disabled:opacity-50"
                    >
                      <option value="">Select Record...</option>
                      {targetDocs.map((td) => (
                        <option key={td} value={td}>
                          {td}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {relError && <p className="text-xs text-red-500">{relError}</p>}

                <button
                  type="submit"
                  className="frappe-btn frappe-btn-primary text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Bind Connection</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Log</h3>
              <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Document created by system operator just now.</span>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notes & Comments</h3>
              <textarea
                placeholder="Add a private note..."
                className="frappe-input w-full h-24"
              ></textarea>
              <button className="frappe-btn frappe-btn-secondary text-xs flex items-center space-x-1">
                <Send className="w-3 h-3 text-slate-500" />
                <span>Add Note</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Document Sidebar (Screenshot 3 & 4 Right Panel) */}
        <aside className="w-64 border-l border-slate-200/80 p-5 bg-white space-y-6 text-xs select-none">
          {/* Avatar Icon Card */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xl flex items-center justify-center border border-slate-200/80 shadow-2xs mb-2">
              {(docName || doctype.name)[0].toLowerCase()}
            </div>
            <div className="font-semibold text-slate-900 text-sm truncate max-w-full">
              {docName || 'Untitled'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {docName ? `${doctype.name.toUpperCase()}-${docName}` : 'Draft'}
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <button className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1 font-medium">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Assign</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1 font-medium">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Attachments</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1 font-medium">
              <div className="flex items-center space-x-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Tags</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 py-1 font-medium">
              <div className="flex items-center space-x-2">
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Share</span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Document Audit Metadata */}
          <div className="space-y-3 text-[11px]">
            <div>
              <div className="text-slate-400 font-medium">Last Edited By You</div>
              <div className="text-slate-700 font-semibold mt-0.5">just now</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Created By You</div>
              <div className="text-slate-700 font-semibold mt-0.5">just now</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Frappe Toast (Bottom Right) */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-100/90 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-2 animate-bounce z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default DocTypeForm;
