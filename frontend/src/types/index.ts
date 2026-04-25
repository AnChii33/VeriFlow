// src/types/index.ts

export type UserRole = 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN';

export type TemplateStatus = 
  | 'pending_ai_flags' 
  | 'pending_legal' 
  | 'pending_ai_redrafts' 
  | 'pending_client_action' 
  | 'approved';

// --- User Models ---
export interface BaseUser {
  id: string; // E.g., C-123, L-456, A-789
  email: string;
  name: string;
  role: UserRole;
}

export interface Client extends BaseUser {
  companyId: string;
  company?: Company;
}

export interface LegalReviewer extends BaseUser {
  barNumber?: string | null;
}

export interface Admin extends BaseUser {}

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  _count?: {
    clients: number;
  };
  createdAt: string;
}

// --- Ledger & Document Models ---
export interface Template {
  id: string;
  title: string;
  documentType: string;
  content: string;
  status: TemplateStatus;
  clientId: string;
  reviewerId?: string | null;
  
  client?: Client;
  reviewer?: LegalReviewer;
  
  flags?: LegalFlag[];
  redrafts?: RedraftedTemplate[];
  auditLogs?: AuditLog[];
  signatures?: DigitalSignature[];

  createdAt: string;
  updatedAt: string;
}

export interface LegalFlag {
  id: string;
  cfr_section: string;
  explanation: string;
  status: string;
  createdAt: string;
}

export interface RedraftedTemplate {
  id: string;
  modContent: string;
  status: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorType: string;
  newState: string;
  details: string;
  createdAt: string;
}

export interface DigitalSignature {
  id: string;
  action: string;
  printedName: string;
  signatureMeaning: string;
  documentHash: string;
  ipAddress?: string;
  userTrace?: string;
  signedAt: string;
}