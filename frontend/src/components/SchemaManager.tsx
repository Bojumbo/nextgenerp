import React, { useState } from 'react';
import { Plus, Trash, Check, Settings, Save } from 'lucide-react';
import { erpApi } from '../lib/api';

interface FieldConfig {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string;
  reqd: boolean;
  read_only: boolean;
  hidden: boolean;
}

interface SchemaManagerProps {
  onSchemaCreated: () => void;
}

export const SchemaManager: React.FC<SchemaManagerProps> = ({ onSchemaCreated }) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('Core');
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addField = () => {
    setFields([
      ...fields,
      {
        fieldname: '',
        label: '',
        fieldtype: 'Data',
        options: '',
        reqd: false,
        read_only: false,
        hidden: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof FieldConfig, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name) {
      setError('DocType Name is required');
      return;
    }

    // Validate fields names
    for (let f of fields) {
      if (!f.fieldname) {
        setError('All fields must have a field name');
        return;
      }
    }

    try {
      await erpApi.createDocType({
        name,
        label: label || name,
        description,
        module,
        fields,
      });
      setSuccess(`DocType '${name}' created successfully!`);
      setName('');
      setLabel('');
      setDescription('');
      setFields([]);
      onSchemaCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create DocType');
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5 text-brand-500" />
        <h2 className="font-display font-semibold text-lg text-white">Create New DocType</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">DocType Name (Unique)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CRM Deal"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. CRM Deal"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of document usecase"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Module</label>
            <input
              type="text"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Fields Definition</h3>
            <button
              type="button"
              onClick={addField}
              className="glow-btn flex items-center space-x-1.5 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Field</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl">
              No custom fields added yet. Press 'Add Field' to append.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={idx} className="glass-card p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="fieldname (lowercase_no_spaces)"
                        value={field.fieldname}
                        onChange={(e) => updateField(idx, 'fieldname', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => updateField(idx, 'label', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <select
                        value={field.fieldtype}
                        onChange={(e) => updateField(idx, 'fieldtype', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="Data">Data (String)</option>
                        <option value="Select">Select (Dropdown)</option>
                        <option value="Link">Link (Relational)</option>
                        <option value="Float">Float (Decimal)</option>
                        <option value="Int">Integer</option>
                        <option value="Check">Check (Boolean)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder={field.fieldtype === 'Link' ? 'Target DocType' : 'Options (comma-separated)'}
                        value={field.options}
                        onChange={(e) => updateField(idx, 'options', e.target.value)}
                        disabled={!['Select', 'Link'].includes(field.fieldtype)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-950 text-xs">
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.reqd}
                          onChange={(e) => updateField(idx, 'reqd', e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                        />
                        <span>Required</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.read_only}
                          onChange={(e) => updateField(idx, 'read_only', e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                        />
                        <span>Read Only</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.hidden}
                          onChange={(e) => updateField(idx, 'hidden', e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                        />
                        <span>Hidden</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-red-400 hover:text-red-300 flex items-center space-x-1"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs p-3.5 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center space-x-2">
            <Check className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          className="glow-btn w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Schema</span>
        </button>
      </form>
    </div>
  );
};
export default SchemaManager;
