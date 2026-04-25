import { Template } from '../types';

export type RootStackParamList = {
  AuthScreen: undefined;
  AdminPanel: undefined;
  ClientDashboard: { clientId: string };
  ReviewerDashboard: { reviewerId: string };
  SubmitDraft: { clientId: string };
  AuditTrailScreen: { template: Template };
  RedraftAction: { template: Template; clientId: string };
  RedraftReviewScreen: { template: Template; reviewerId: string };
};