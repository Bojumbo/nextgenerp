import React, { useState } from 'react';
import {
  X,
  Box,
  Building2,
  Calculator,
  Layers,
  ShoppingBag,
  Factory,
  FolderKanban,
  ShieldCheck,
  Package,
  Boxes,
  Users,
  Check
} from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (workspace: {
    id: string;
    title: string;
    iconName: string;
    bg: string;
  }) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Box', icon: Box },
  { name: 'Building2', icon: Building2 },
  { name: 'Calculator', icon: Calculator },
  { name: 'Layers', icon: Layers },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Factory', icon: Factory },
  { name: 'FolderKanban', icon: FolderKanban },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'Package', icon: Package },
  { name: 'Boxes', icon: Boxes },
  { name: 'Users', icon: Users },
];

const AVAILABLE_COLORS = [
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-purple-600 text-white',
  'bg-slate-700 text-white',
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('FolderKanban');
  const [selectedColor, setSelectedColor] = useState('bg-blue-600 text-white');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Page title is required');
      return;
    }

    const id = title.trim();

    onCreate({
      id,
      title: title.trim(),
      iconName: selectedIcon,
      bg: selectedColor,
    });

    setTitle('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Create New Workspace Page</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Page / Module Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Human Resources, Marketing, Supply Chain"
              className="frappe-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`h-9 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-600 font-bold shadow-2xs'
                        : 'border-slate-200/80 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Accent Color
            </label>
            <div className="flex items-center space-x-2">
              {AVAILABLE_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className={`w-7 h-7 rounded-full ${col} flex items-center justify-center transition-transform ${
                    selectedColor === col ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'
                  }`}
                >
                  {selectedColor === col && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="frappe-btn frappe-btn-secondary flex-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="frappe-btn frappe-btn-primary flex-1 text-xs"
            >
              Create Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateWorkspaceModal;
