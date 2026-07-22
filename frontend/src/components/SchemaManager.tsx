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
    <div className="frappe-card p-6 max-w-4xl space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
        <Settings className="w-5 h-5 text-slate-700" />
        <h2 className="font-bold text-base text-slate-900">Create New DocType Schema</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">DocType Name (Unique)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead"
              className="frappe-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lead"
              className="frappe-input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of document usecase"
              className="frappe-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
            <input
              type="text"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="frappe-input w-full"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fields Definition</h3>
            <button
              type="button"
              onClick={addField}
              className="frappe-btn frappe-btn-secondary text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">
              No custom fields added yet. Press 'Add Field' to append.
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="fieldname (lowercase_no_spaces)"
                        value={field.fieldname}
                        onChange={(e) => updateField(idx, 'fieldname', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="frappe-input w-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => updateField(idx, 'label', e.target.value)}
                        className="frappe-input w-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <select
                        value={field.fieldtype}
                        onChange={(e) => updateField(idx, 'fieldtype', e.target.value)}
                        className="frappe-input w-full bg-white text-xs"
                      >
                        <option value="Data">Data (String)</option>
                        <option value="Select">Select (Dropdown)</option>
                        <option value="Link">Link (Relational)</option>
                        <option value="Float">Float (Decimal)</option>
                        <option value="Int">Integer</option>
                        <option value="Check">Check (Boolean)</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder={field.fieldtype === 'Link' ? 'Target DocType' : 'Options (comma-separated)'}
                        value={field.options}
                        onChange={(e) => updateField(idx, 'options', e.target.value)}
                        disabled={!['Select', 'Link'].includes(field.fieldtype)}
                        className="frappe-input w-full bg-white text-xs disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.reqd}
                          onChange={(e) => updateField(idx, 'reqd', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-3.5 w-3.5"
                        />
                        <span>Required</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.read_only}
                          onChange={(e) => updateField(idx, 'read_only', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-3.5 w-3.5"
                        />
                        <span>Read Only</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.hidden}
                          onChange={(e) => updateField(idx, 'hidden', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-3.5 w-3.5"
                        />
                        <span>Hidden</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-red-500 hover:text-red-700 flex items-center space-x-1"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-200 flex items-center space-x-2"><Check className="w-4 h-4" /><span>{success}</span></div>}

        <button type="submit" className="frappe-btn frappe-btn-primary w-full text-xs py-2.5">
          <Save className="w-4 h-4 mr-1.5" />
          <span>Save Schema</span>
        </button>
      </form>
    </div>
  );
};
export default SchemaManager;
