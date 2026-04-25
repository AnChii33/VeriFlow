// src/services/api.ts
import { Platform } from 'react-native';

// DROP YOUR SPECIFIC IP ADDRESS HERE (e.g., '192.168.1.45')
const PHYSICAL_IP = '192.168.0.149'; 

const getApiBase = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  
  // If running on an Android Emulator and no physical IP is set
  if (Platform.OS === 'android' && PHYSICAL_IP === '192.168.0.149') {
    return 'http://10.0.2.2:3000/api';
  }

  // Physical Device (iOS/Android)
  return `http://${PHYSICAL_IP !== '192.168.0.149' ? PHYSICAL_IP : 'localhost'}:3000/api`;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL || getApiBase();

export const veriflowApi = {
  // --- AUTHENTICATION ---
  login: async (credentials: any) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // --- CLIENT OPERATIONS ---
  submitTemplate: async (data: { title: string; documentType: string; content: string; clientId: string }) => {
    const res = await fetch(`${API_BASE}/templates/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Submission failed');
    return res.json();
  },

  getClientTemplates: async (clientId: string) => {
    const res = await fetch(`${API_BASE}/client/templates/${clientId}`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  respondToRedraft: async (id: string, action: 'ACCEPT' | 'RE_SUBMIT', manualContent?: string, selectedRedraftId?: string) => {
    const res = await fetch(`${API_BASE}/client/respond/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, manualContent, selectedRedraftId })
    });
    if (!res.ok) throw new Error('Response failed');
    return res.json();
  },

  // --- LEGAL REVIEWER OPERATIONS ---
  getLegalQueue: async () => {
    const res = await fetch(`${API_BASE}/legal/queue`);
    if (!res.ok) throw new Error('Failed to fetch legal queue');
    return res.json();
  },

  // UPDATED: Now sends the 'decisions' object to the backend for flag-by-flag updates
  submitReviewDecision: async (templateId: string, reviewerId: string, decisions: Record<string, 'confirmed' | 'ignored'>) => {
    const res = await fetch(`${API_BASE}/legal/review/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId, decisions })
    });
    if (!res.ok) throw new Error('Review submission failed');
    return res.json();
  },

  // --- ADMIN OPERATIONS ---
  getAdminLedger: async () => {
    const res = await fetch(`${API_BASE}/admin/ledger`);
    if (!res.ok) throw new Error('Failed to fetch ledger');
    return res.json();
  },

  getCompanies: async () => {
    const res = await fetch(`${API_BASE}/admin/companies`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },

  createCompany: async (data: { name: string; domain?: string }) => {
    const res = await fetch(`${API_BASE}/admin/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create company');
    return res.json();
  },

  deleteCompany: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/companies/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete company');
    return res.json();
  },

  getUsers: async () => {
    const res = await fetch(`${API_BASE}/admin/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  createUser: async (userData: any) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // ADDED: Missing method that matches your app.patch('/api/admin/users/:id') backend route
  updateUser: async (id: string, userData: any) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteUser: async (id: string, role: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  }
};