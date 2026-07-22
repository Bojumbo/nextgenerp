import React, { useState, useEffect } from 'react';
import { Database, Link, Share2, FileDown, Plus, Mail } from 'lucide-react';
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
  fields: Array<{ fieldname: string; label: string; fieldtype: string }>;
}

interface DocInstanceListProps {
  doctype: DocType;
  allDocTypes: DocType[];
  role: string;
  refreshTrigger: number;
  onEditDoc: (doc: DocInstance) => void;
}

export const DocInstanceList: React.FC<DocInstanceListProps> = ({
  doctype,
  allDocTypes,
  role,
  refreshTrigger,
  onEditDoc,
}) => {
  const [documents, setDocuments] = useState<DocInstance[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocInstance | null>(null);

  // Link form state
  const [targetDoctype, setTargetDoctype] = useState('');
  const [targetDocName, setTargetDocName] = useState('');
  const [relationType, setRelationType] = useState('Payment Link');
  const [targetDocs, setTargetDocs] = useState<string[]>([]);
  const [relError, setRelError] = useState('');
  
  // PDF Render State
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
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
      if (selectedDoc) {
        // find fresh instance
        const fresh = docs.find((d: any) => d.name === selectedDoc.name);
        setSelectedDoc(fresh || null);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [doctype, role, refreshTrigger]);

  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });

  // Load relations and graph when selectedDoc changes
  useEffect(() => {
    const fetchRelationsAndGraph = async () => {
      if (!selectedDoc) {
        setRelations([]);
        setGraph({ nodes: [], edges: [] });
        return;
      }
      try {
        const rels = await erpApi.getRelations(selectedDoc.doctype_name, selectedDoc.name);
        setRelations(rels);
        
        const gr = await erpApi.getGraph(selectedDoc.doctype_name, selectedDoc.name);
        setGraph(gr);
      } catch (err) {
        console.error('Failed to load relations/graph', err);
      }
    };
    fetchRelationsAndGraph();
  }, [selectedDoc]);

  // Load target documents when target Doctype changes in relations editor
  useEffect(() => {
    const fetchTargetDocs = async () => {
      if (!targetDoctype) {
        setTargetDocs([]);
        return;
      }
      try {
        const docs = await erpApi.getDocuments(targetDoctype, role);
        setTargetDocs(docs.map((d: any) => d.name));
      } catch (err) {
        console.error('Failed to load target docs', err);
        setTargetDocs([]);
      }
    };
    fetchTargetDocs();
  }, [targetDoctype, role]);

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRelError('');
    if (!selectedDoc || !targetDoctype || !targetDocName) {
      setRelError('Please fill all fields');
      return;
    }
    try {
      await erpApi.createRelation(
        selectedDoc.doctype_name,
        selectedDoc.name,
        targetDoctype,
        targetDocName,
        relationType
      );
      // Reload relations
      const rels = await erpApi.getRelations(selectedDoc.doctype_name, selectedDoc.name);
      setRelations(rels);
      setTargetDocName('');
    } catch (err: any) {
      setRelError(err.response?.data?.detail || 'Link creation failed');
    }
  };

  const handleSafeRender = async (salesDoc: DocInstance) => {
    setIsRendering(true);
    try {
      const pdfBlob = await erpApi.printPdf(salesDoc.doctype_name, salesDoc.name);
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err: any) {
      alert(`PDF Render Failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  const handleSimulateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus('Queueing...');
    try {
      const res = await erpApi.ingestEmail(emailSender, emailSubject, emailBody);
      setEmailStatus(`Success! Job queued in Redis ARQ. ID: ${res.job_id}`);
      fetchDocs();
    } catch (err: any) {
      setEmailStatus(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* List Panel */}
      <div className="xl:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-brand-500" />
              <h2 className="font-display font-semibold text-lg text-white">
                {doctype.name} Documents
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {documents.length} Records
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500">No documents found for schema '{doctype.name}'</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium text-xs">
                    <th className="py-3 px-4 uppercase">Name</th>
                    {doctype.fields
                      .filter((f) => !f.hidden || role === 'Admin')
                      .slice(0, 3)
                      .map((f) => (
                        <th key={f.fieldname} className="py-3 px-4 uppercase">
                          {f.label}
                        </th>
                      ))}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${
                        selectedDoc?.id === doc.id ? 'bg-brand-950/20' : ''
                      }`}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <td className="py-3.5 px-4 font-semibold text-white">{doc.name}</td>
                      {doctype.fields
                        .filter((f) => !f.hidden || role === 'Admin')
                        .slice(0, 3)
                        .map((f) => {
                          const val = doc.data[f.fieldname];
                          let rendered = String(val ?? '');
                          if (f.fieldtype === 'Check') {
                            rendered = val ? 'True' : 'False';
                          }
                          return (
                            <td key={f.fieldname} className="py-3.5 px-4 text-slate-300">
                              {rendered}
                            </td>
                          );
                        })}
                      <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEditDoc(doc)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-slate-200 border border-slate-700"
                        >
                          Edit
                        </button>
                        {doctype.name === 'Sales' && (
                          <button
                            onClick={() => handleSafeRender(doc)}
                            className="text-xs bg-blue-900/40 hover:bg-blue-800 border border-blue-700 font-semibold px-2.5 py-1.5 rounded-lg text-blue-200"
                          >
                            Safe Print PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Email Worker Simulation widget */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="h-5 w-5 text-brand-500" />
            <h3 className="font-display font-semibold text-white text-base">
              Background Email Worker Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Simulate a background system receiving an email. The ARQ background worker scans database contacts,
            creates dynamic Email files, and resolves contextual links with Deals or Projects.
          </p>
          <form onSubmit={handleSimulateEmail} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sender Email</label>
              <input
                type="email"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full glow-btn bg-slate-800 text-xs text-brand-400 font-semibold border border-brand-900 rounded-lg p-2 hover:bg-slate-700"
              >
                Trigger Ingestion Job
              </button>
            </div>
          </form>
          {emailStatus && (
            <p className="text-xs mt-3 bg-slate-900/60 p-2.5 rounded-lg text-brand-300 font-mono border border-slate-800">
              {emailStatus}
            </p>
          )}
        </div>
      </div>

      {/* Relations & Previews Panel */}
      <div className="space-y-6">
        {selectedDoc ? (
          <>
            {/* Relation Editor */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 mb-4">
                <Share2 className="h-5 w-5 text-brand-500" />
                <h3 className="font-display font-semibold text-white text-base">
                  Polymorphic Relations Linker
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Current Doc: <span className="text-white font-semibold">{selectedDoc.name}</span>
              </p>

              {/* Existing relations */}
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Linked Connections</h4>
                {relations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No dynamic relations resolved.</p>
                ) : (
                  <div className="space-y-1.5">
                    {relations.map((rel) => {
                      const isParent = rel.source_id === selectedDoc.name;
                      const label = isParent
                        ? `➡️ ${rel.relation_type}: ${rel.target_id} (${rel.target_type})`
                        : `⬅️ ${rel.relation_type}: ${rel.source_id} (${rel.source_type})`;
                      return (
                        <div
                          key={rel.id}
                          className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300"
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recursive Graph Nodes */}
              <div className="space-y-2 mb-6 border-t border-slate-800/50 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                  <span>Recursive Graph Nodes ({graph.nodes.length})</span>
                  <span className="text-[10px] text-slate-500 font-mono">depth: max 10</span>
                </h4>
                {graph.nodes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No graph nodes resolved.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {graph.nodes.map((node) => (
                      <div key={node.id} className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <div className="flex justify-between font-semibold text-slate-200 mb-1">
                          <span>{node.name}</span>
                          <span className="text-[10px] text-brand-400 bg-brand-950/40 border border-brand-900/30 px-1.5 py-0.5 rounded-full">{node.doctype_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          {Object.entries(node.data).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-slate-500">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link form */}
              <form onSubmit={handleCreateRelation} className="space-y-3 pt-4 border-t border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Create Dynamic Link</h4>
                <div>
                  <select
                    value={targetDoctype}
                    onChange={(e) => setTargetDoctype(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="">Select Target DocType...</option>
                    {allDocTypes
                      .filter((t) => t.name !== selectedDoc.doctype_name)
                      .map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <select
                    value={targetDocName}
                    onChange={(e) => setTargetDocName(e.target.value)}
                    disabled={!targetDoctype}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-40"
                  >
                    <option value="">Select Target Record...</option>
                    {targetDocs.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Relation Type (e.g. payment, contact)"
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                {relError && <p className="text-xs text-red-400 bg-red-950/20 p-2 rounded">{relError}</p>}
                <button
                  type="submit"
                  className="glow-btn w-full bg-brand-600 hover:bg-brand-500 font-semibold text-white text-xs py-2 rounded-lg flex items-center justify-center space-x-1"
                >
                  <Link className="h-3.5 w-3.5" />
                  <span>Bind Relation</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center py-12">
            <Share2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Select a document to inspect relations and details</p>
          </div>
        )}

        {/* Live Safe Render Preview */}
        {pdfHtml && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-semibold text-white flex items-center space-x-1">
                <FileDown className="h-4.5 w-4.5 text-blue-400" />
                <span>Safe PDF Render Preview</span>
              </span>
              <button
                onClick={() => setPdfHtml(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div
              className="bg-white text-black p-4 rounded-xl max-h-[350px] overflow-y-auto text-xs"
              dangerouslySetInnerHTML={{ __html: pdfHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default DocInstanceList;
