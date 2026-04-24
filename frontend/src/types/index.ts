export type FSMStatus = 
  | 'pending_ai_flags' 
  | 'pending_legal' 
  | 'pending_ai_redrafts' 
  | 'pending_client_action' 
  | 'approved';

export interface Company {
  id: string;
  name: string;
  domain?: string;
  createdAt: string;
  clients?: Client[];
}

export interface Client {
  id: string;
  email: string;
  name: string;
  companyId: string;
  company?: Company;
  createdAt: string;
  templates?: Template[];
  signatures?: SignatureRecord[];
}

export interface LegalReviewer {
  id: string;
  email: string;
  name: string;
  barNumber?: string;
  createdAt: string;
  assignedDocs?: Template[];
  signatures?: SignatureRecord[];
}

export interface LegalFlag {
  id: string;
  templateId: string;
  cfr_section: string;
  explanation: string;
  status: string;
  createdAt: string;
}

export interface RedraftedTemplate {
  id: string;
  templateId: string;
  modContent: string;
  status: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  templateId: string;
  actorId: string;
  actorType: 'CLIENT' | 'AI' | 'LEGAL_REVIEWER' | 'ADMIN';
  prevState?: string;
  newState: string;
  details?: string;
  createdAt: string;
}

export interface SignatureRecord {
  id: string;
  templateId: string;
  action: string;
  clientId?: string;
  client?: Client;
  reviewerId?: string;
  reviewer?: LegalReviewer;
  printedName: string;
  signatureMeaning: string;
  documentHash: string;
  ipAddress?: string;
  userTrace?: string;
  signedAt: string;
}

export interface Template {
  id: string;
  content: string;
  status: FSMStatus;
  title: string;
  documentType: string;
  clientId: string;
  client?: Client;
  reviewerId?: string;
  reviewer?: LegalReviewer;
  createdAt: string;
  updatedAt: string;
  flags: LegalFlag[];
  redrafts: RedraftedTemplate[];
  auditLogs: AuditLog[];
  signatures: SignatureRecord[];
}