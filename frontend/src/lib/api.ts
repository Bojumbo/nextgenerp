import axios from 'axios';

// Вказуємо відносний шлях, який підхоплює Nginx
const BACKEND_URL = import.meta.env.VITE_API_URL || '/api/v1';
const PDF_SERVICE_URL = import.meta.env.VITE_PDF_SERVICE_URL || '/api/v1/print';

// Create base axios instances
export const api = axios.create({
  baseURL: BACKEND_URL,
});

export const pdfApi = axios.create({
  baseURL: PDF_SERVICE_URL,
});

// Configure client APIs
export const erpApi = {
  // DocTypes
  getDocTypes: async (role: string = 'Admin') => {
    const res = await api.get('/doctypes', { headers: { 'X-User-Role': role } });
    return res.data;
  },
  getDocType: async (name: string, role: string = 'Admin') => {
    const res = await api.get(`/doctypes/${name}`, { headers: { 'X-User-Role': role } });
    return res.data;
  },
  createDocType: async (payload: any) => {
    const res = await api.post('/doctypes', payload);
    return res.data;
  },

  // Documents
  getDocuments: async (doctype: string, role: string = 'Admin') => {
    const res = await api.get(`/documents/${doctype}`, { headers: { 'X-User-Role': role } });
    return res.data;
  },
  getDocument: async (doctype: string, name: string, role: string = 'Admin') => {
    const res = await api.get(`/documents/${doctype}/${name}`, { headers: { 'X-User-Role': role } });
    return res.data;
  },
  createDocument: async (doctype: string, name: string, data: any, role: string = 'Admin') => {
    const res = await api.post(`/documents/${doctype}`, {
      name,
      data,
    }, { headers: { 'X-User-Role': role } });
    return res.data;
  },
  updateDocument: async (doctype: string, name: string, data: any, role: string = 'Admin') => {
    const res = await api.put(`/documents/${doctype}/${name}`, {
      data,
    }, { headers: { 'X-User-Role': role } });
    return res.data;
  },
  deleteDocument: async (doctype: string, name: string, role: string = 'Admin') => {
    const res = await api.delete(`/documents/${doctype}/${name}`, { headers: { 'X-User-Role': role } });
    return res.data;
  },

  // Relations
  getRelations: async (doctype: string, name: string) => {
    const res = await api.get(`/documents/relations/${doctype}/${name}`);
    return res.data;
  },
  createRelation: async (source_type: string, source_id: string, target_type: string, target_id: string, relation_type: string) => {
    const res = await api.post('/documents/relation', {
      source_type,
      source_id,
      target_type,
      target_id,
      relation_type,
    });
    return res.data;
  },
  getGraph: async (doctype: string, name: string) => {
    const res = await api.get(`/documents/graph/${doctype}/${name}`);
    return res.data;
  },

  // Email Ingestion simulator
  ingestEmail: async (sender_email: string, subject: string, body: string) => {
    const res = await api.post('/documents/ingest-email', {
      sender_email,
      subject,
      body,
    });
    return res.data;
  },

  // Translations
  importTranslations: async (language: string, translations: Record<string, string>) => {
    const res = await api.post('/translations/import', { language, translations });
    return res.data;
  },
  createCustomTranslation: async (language: string, source_text: string, translated_text: string) => {
    const res = await api.post('/translations/custom-fields', { language, source_text, translated_text });
    return res.data;
  },

  // Print PDF
  printPdf: async (doctype: string, name: string) => {
    const res = await api.get(`/print/pdf/${doctype}/${name}`, { responseType: 'blob' });
    return res.data;
  },
};
