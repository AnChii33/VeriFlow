import { Template, FSMStatus } from '../types';

const BASE_URL = 'http://localhost:3000/api';

export const veriflowApi = {
  getLedger: async (): Promise<Template[]> => {
    const response = await fetch(`${BASE_URL}/admin/ledger`);
    if (!response.ok) throw new Error('Ledger retrieval failed');
    return response.json();
  },

  submitTemplate: async (payload: {
    title: string;
    documentType: string;
    content: string;
    clientId: string;
  }): Promise<Template> => {
    const response = await fetch(`${BASE_URL}/templates/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Template submission failed');
    return response.json();
  },

  reviewTemplate: async (id: string, reviewerId: string): Promise<{ status: FSMStatus }> => {
    const response = await fetch(`${BASE_URL}/legal/review/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId }),
    });
    if (!response.ok) throw new Error('Review processing failed');
    return response.json();
  },

  clientRespond: async (
    id: string, 
    action: 'ACCEPT' | 'RE_SUBMIT', 
    manualContent?: string
  ): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/client/respond/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, manualContent }),
    });
    if (!response.ok) throw new Error('Response submission failed');
    return response.json();
  }
};