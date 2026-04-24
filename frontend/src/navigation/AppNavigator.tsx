import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

import AuthScreen from '../features/auth/AuthScreen';
import AdminPanel from '../features/admin/AdminPanel';
import AuditTrailScreen from '../features/admin/AuditTrailScreen';
import ClientDashboard from '../features/client/ClientDashboard';
import SubmitDraft from '../features/client/SubmitDraft';
import RedraftAction from '../features/client/RedraftAction';
import ReviewerDashboard from '../features/reviewer/ReviewerDashboard';
import RedraftReviewScreen from '../features/reviewer/RedraftReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Auth"
      screenOptions={{ 
        headerShown: false, 
        animation: 'fade' 
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanel} />
      <Stack.Screen name="AuditTrailScreen" component={AuditTrailScreen} />
      <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
      <Stack.Screen name="SubmitDraft" component={SubmitDraft} />
      <Stack.Screen name="RedraftAction" component={RedraftAction} />
      <Stack.Screen name="ReviewerDashboard" component={ReviewerDashboard} />
      <Stack.Screen name="RedraftReviewScreen" component={RedraftReviewScreen} />
    </Stack.Navigator>
  );
}