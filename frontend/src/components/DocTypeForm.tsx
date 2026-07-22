import React, { useState, useEffect } from 'react';
import { FileText, Save, Link as LinkIcon, RefreshCcw } from 'lucide-react';
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
}

export const DocTypeForm: React.FC<DocTypeFormProps> = ({ doctype, role, existingDoc, onSaveSuccess }) => {
  const [docName, setDocName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing doc if editing
  useEffect(() => {
    if (existingDoc) {
      setDocName(existingDoc.name);
      setFormData(existingDoc.data);
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
    }
    setError('');
    setSuccess('');
  }, [doctype, existingDoc]);

  // Load link field options
  useEffect(() => {
    const fetchLinkOptions = async () => {
      const links = doctype.fields.filter((f) => f.fieldtype === 'Link' && f.options);
      const optionsMap: Record<string, string[]> = {};
      
      for (let link of links) {
        try {
          const docs = await erpApi.getDocuments(link.options!, role);
          optionsMap[link.fieldname] = docs.map((d: any) => d.name);
        } catch (err) {
          console.error(`Failed to load link options for ${link.options}`, err);
          optionsMap[link.fieldname] = [];
        }
      }
      setLinkOptions(optionsMap);
    };

    fetchLinkOptions();
  }, [doctype, role]);

  const handleChange = (fieldname: string, val: any) => {
    setFormData({
      ...formData,
      [fieldname]: val,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!existingDoc && !docName) {
      setError('Document ID/Name is required');
      return;
    }

    try {
      if (existingDoc) {
        // Update
        await erpApi.updateDocument(doctype.name, existingDoc.name, formData, role);
        setSuccess('Document updated successfully!');
      } else {
        // Create
        await erpApi.createDocument(doctype.name, docName, formData, role);
        setSuccess('Document created successfully!');
        setDocName('');
        // reset form
        const reset: Record<string, any> = {};
        doctype.fields.forEach((f) => {
          reset[f.fieldname] = f.fieldtype === 'Check' ? false : '';
        });
        setFormData(reset);
      }
      onSaveSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save document');
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center space-x-2 mb-6">
        <FileText className="h-5 w-5 text-brand-500" />
        <h2 className="font-display font-semibold text-lg text-white">
          {existingDoc ? `Edit ${doctype.name}: ${existingDoc.name}` : `New ${doctype.name}`}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Document Name / ID</label>
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            disabled={!!existingDoc}
            placeholder={doctype.name === 'Sales' ? 'e.g. SALES-0001' : 'e.g. INVOICE-100'}
            className="w-full bg-slate-900/60 disabled:opacity-50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctype.fields
            .filter((f) => !f.hidden || role === 'Admin') // Enforce read field security
            .map((field) => {
              const isReadOnly = field.read_only && role !== 'Admin';

              return (
                <div key={field.fieldname}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center space-x-1">
                    <span>{field.label || field.fieldname}</span>
                    {field.reqd && <span className="text-red-500 font-bold">*</span>}
                    {field.hidden && <span className="text-[10px] text-yellow-500 border border-yellow-500/30 px-1 rounded">Hidden</span>}
                    {field.read_only && <span className="text-[10px] text-blue-500 border border-blue-500/30 px-1 rounded">Read-Only</span>}
                  </label>

                  {field.fieldtype === 'Check' ? (
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        checked={!!formData[field.fieldname]}
                        onChange={(e) => handleChange(field.fieldname, e.target.checked)}
                        disabled={isReadOnly}
                        className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                  ) : field.fieldtype === 'Select' ? (
                    <select
                      value={formData[field.fieldname] || ''}
                      onChange={(e) => handleChange(field.fieldname, e.target.value)}
                      disabled={isReadOnly}
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    >
                      <option value="">Select option...</option>
                      {(field.options || '')
                        .split(',')
                        .map((opt) => opt.trim())
                        .filter(Boolean)
                        .map((opt) => (
                          <option key={opt} value={opt} className="bg-slate-900 text-white">
                            {opt}
                          </option>
                        ))}
                    </select>
                  ) : field.fieldtype === 'Link' ? (
                    <div className="relative">
                      <select
                        value={formData[field.fieldname] || ''}
                        onChange={(e) => handleChange(field.fieldname, e.target.value)}
                        disabled={isReadOnly}
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors pr-10"
                      >
                        <option value="">Link to {field.options}...</option>
                        {(linkOptions[field.fieldname] || []).map((name) => (
                          <option key={name} value={name} className="bg-slate-900 text-white">
                            {name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-3 text-slate-500">
                        <LinkIcon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                  ) : (
                    <input
                      type={['Float', 'Int'].includes(field.fieldtype) ? 'number' : 'text'}
                      step={field.fieldtype === 'Float' ? '0.01' : '1'}
                      value={formData[field.fieldname] ?? ''}
                      onChange={(e) => handleChange(field.fieldname, e.target.value)}
                      disabled={isReadOnly}
                      placeholder={field.label}
                      className="w-full bg-slate-900/60 disabled:opacity-50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    />
                  )}
                </div>
              );
            })}
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs p-3.5 rounded-xl whitespace-pre-line">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-3.5 rounded-xl">
            {success}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            className="glow-btn flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{existingDoc ? 'Update Document' : 'Create Document'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default DocTypeForm;
