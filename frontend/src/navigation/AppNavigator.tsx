import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

// Import all our new screens
import AuthScreen from '../features/auth/AuthScreen';
import AdminPanel from '../features/admin/AdminPanel';
import ClientDashboard from '../features/client/ClientDashboard';
import ReviewerDashboard from '../features/reviewer/ReviewerDashboard';
import SubmitDraft from '../features/client/SubmitDraft';
import AuditTrailScreen from '../features/admin/AuditTrailScreen';
import RedraftAction from '../features/client/RedraftAction';
import RedraftReviewScreen from '../features/reviewer/RedraftReviewScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="AuthScreen"
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#080808' } // Match brand-dark
      }}
    >
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanel} />
      <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
      <Stack.Screen name="ReviewerDashboard" component={ReviewerDashboard} />
      <Stack.Screen name="SubmitDraft" component={SubmitDraft} />
      <Stack.Screen name="AuditTrailScreen" component={AuditTrailScreen} />
      <Stack.Screen name="RedraftAction" component={RedraftAction} />
      <Stack.Screen name="RedraftReviewScreen" component={RedraftReviewScreen} />
    </Stack.Navigator>
  );
}