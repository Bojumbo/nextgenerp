import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Printer,
  Edit2
} from 'lucide-react';
import { erpApi } from '../lib/api';

interface DocInstance {
  id: string;
  doctype_name: string;
  name: string;
  data: Record<string, any>;
  created_at: string;
}

interface DocType {
  name: string;
  fields: Array<{ fieldname: string; label: string; fieldtype: string; hidden?: boolean }>;
}

interface DocInstanceListProps {
  doctype: DocType;
  allDocTypes: DocType[];
  role: string;
  refreshTrigger: number;
  onEditDoc: (doc: DocInstance) => void;
  onCreateNew?: () => void;
}

export const DocInstanceList: React.FC<DocInstanceListProps> = ({
  doctype,
  allDocTypes,
  role,
  refreshTrigger,
  onEditDoc,
  onCreateNew,
}) => {
  const [documents, setDocuments] = useState<DocInstance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  // Email simulation State
  const [emailSender, setEmailSender] = useState('john@example.com');
  const [emailSubject, setEmailSubject] = useState('Deal Match for DEAL-001');
  const [emailBody, setEmailBody] = useState('Hello, checking in on the CRM deal.');
  const [emailStatus, setEmailStatus] = useState('');

  const fetchDocs = async () => {
    try {
      const docs = await erpApi.getDocuments(doctype.name, role);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [doctype, role, refreshTrigger]);

  const handlePrintPdf = async (doc: DocInstance) => {
    setIsRendering(true);
    try {
      const pdfBlob = await erpApi.printPdf(doc.doctype_name, doc.name);
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err: any) {
      alert(`PDF Print Failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  const handleSimulateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus('Queueing...');
    try {
      const res = await erpApi.ingestEmail(emailSender, emailSubject, emailBody);
      setEmailStatus(`Queued job ID: ${res.job_id}`);
      fetchDocs();
    } catch (err: any) {
      setEmailStatus(`Failed: ${err.message}`);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    JSON.stringify(d.data).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">{doctype.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{documents.length} records</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={`Filter ${doctype.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="frappe-input pl-8 pr-3 py-1.5 w-48 text-xs"
            />
          </div>

          <button className="frappe-btn frappe-btn-secondary text-xs flex items-center space-x-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Filter</span>
          </button>

          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="frappe-btn frappe-btn-primary text-xs flex items-center space-x-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {doctype.name}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Documents Table Card */}
      <div className="frappe-card overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No records found for '{doctype.name}'
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4 w-8">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th className="py-2.5 px-4">Name</th>
                  {doctype.fields
                    .filter((f) => !f.hidden || role === 'Admin')
                    .slice(0, 3)
                    .map((f) => (
                      <th key={f.fieldname} className="py-2.5 px-4">
                        {f.label || f.fieldname}
                      </th>
                    ))}
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => onEditDoc(doc)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{doc.name}</td>
                    {doctype.fields
                      .filter((f) => !f.hidden || role === 'Admin')
                      .slice(0, 3)
                      .map((f) => {
                        const val = doc.data[f.fieldname];
                        let rendered = String(val ?? '');
                        if (f.fieldtype === 'Check') {
                          rendered = val ? 'True' : 'False';
                        }

                        // Badge styling for status
                        if (f.fieldname.toLowerCase().includes('status')) {
                          const isSuccess = ['completed', 'paid', 'active', 'won'].includes(
                            rendered.toLowerCase()
                          );
                          return (
                            <td key={f.fieldname} className="py-2.5 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                                  isSuccess
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {rendered}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={f.fieldname} className="py-2.5 px-4 text-slate-600">
                            {rendered}
                          </td>
                        );
                      })}
                    <td
                      className="py-2.5 px-4 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEditDoc(doc)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                        title="Edit Document"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePrintPdf(doc)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                        title="Print PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Background Email Ingestion Widget */}
      <div className="frappe-card p-4 space-y-3">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
          <Mail className="w-4 h-4 text-blue-600" />
          <span>Email Ingestion Pipeline Simulator</span>
        </div>
        <form onSubmit={handleSimulateEmail} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Sender Email</label>
            <input
              type="email"
              value={emailSender}
              onChange={(e) => setEmailSender(e.target.value)}
              className="frappe-input w-full mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="frappe-input w-full mt-1"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="frappe-btn frappe-btn-primary w-full text-xs">
              Simulate Ingest Job
            </button>
          </div>
        </form>
        {emailStatus && (
          <div className="text-xs font-mono text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">
            {emailStatus}
          </div>
        )}
      </div>
    </div>
  );
};
export default DocInstanceList;
