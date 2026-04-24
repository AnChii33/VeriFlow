import { FSMStatus } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  AdminPanel: undefined;
  AuditTrailScreen: { templateId: string };
  ClientDashboard: { clientId: string };
  SubmitDraft: { clientId: string };
  RedraftAction: { templateId: string }; 
  ReviewerDashboard: { reviewerId: string };
  RedraftReviewScreen: { templateId: string; reviewerId: string };
};