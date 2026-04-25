// src/features/client/ClientDashboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import AppButton from '../../components/base/AppButton';
import StatusBadge from '../../components/base/StatusBadge';
import MetricCard from '../../components/layout/MetricCard';

export default function ClientDashboard({ route }: any) {
  const navigation = useNavigation<any>();
  const { clientId } = route.params;
  
  const { height: screenHeight } = useWindowDimensions();
  const { isWeb } = getDeviceTrace();

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTemplates = async () => {
    try {
      const data = await veriflowApi.getClientTemplates(clientId);
      setTemplates(data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch secure records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTemplates();
    });
    return unsubscribe;
  }, [navigation, clientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const handleTemplateClick = (template: any) => {
    if (template.status === 'pending_client_action') {
      navigation.navigate('RedraftAction', { template, clientId });
    } else {
      navigation.navigate('AuditTrailScreen', { template });
    }
  };

  const actionRequiredCount = templates.filter(t => t.status === 'pending_client_action').length;
  const approvedCount = templates.filter(t => t.status === 'approved').length;

  return (
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
      {/* Fixed Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border flex-row justify-between items-center">
        <View>
          <Text className="text-brand-text text-2xl font-black tracking-tighter">Client Terminal</Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            Client ID: { clientId }
          </Text>
        </View>
        
        <View className="flex-row items-center gap-3">
          <AppButton 
            title={isWeb ? "Logout" : "Exit"} 
            variant="ghost" 
            onPress={() => navigation.replace('AuthScreen')} 
            className="w-16 sm:w-24 h-10" 
          />
          <AppButton 
            title="+ New Draft" 
            onPress={() => navigation.navigate('SubmitDraft', { clientId })} 
            className="w-28 sm:w-40 h-10" 
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1, ...(isWeb && { overflowY: 'auto' as any }) }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: isWeb ? 32 : 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
      >
        <View className={isWeb ? "w-full max-w-5xl mx-auto" : "w-full"}>
          {loading ? (
            <ActivityIndicator size="large" color="#EAB308" className="mt-20" />
          ) : (
            <>
              <View className={isWeb ? "flex-row gap-4 mb-8" : "mb-6 gap-y-4"}>
                <View className="flex-1"><MetricCard label="Total Drafts" value={templates.length} /></View>
                <View className="flex-1"><MetricCard label="Action Required" value={actionRequiredCount} /></View>
                <View className="flex-1"><MetricCard label="Approved" value={approvedCount} /></View>
              </View>

              <Text className="text-brand-text text-xl font-black tracking-tighter mb-4 px-2">Recent Documents</Text>

              {templates.length === 0 ? (
                <InfoCard className="items-center py-10">
                  <Text className="text-brand-muted font-bold text-center">No documents found.</Text>
                  <Text className="text-brand-muted text-xs mt-2 text-center">Click "+ New Draft" to submit a document to the system.</Text>
                </InfoCard>
              ) : (
                templates.map((doc) => (
                  <TouchableOpacity 
                    key={doc.id} 
                    activeOpacity={0.8} 
                    onPress={() => handleTemplateClick(doc)}
                  >
                    <InfoCard className={`mb-4 ${doc.status === 'pending_client_action' ? 'border-brand-danger/50' : ''}`}>
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 pr-4">
                          <Text className="text-brand-text text-lg font-black tracking-tight">{doc.title}</Text>
                          <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mt-1">
                            Type: {doc.documentType}
                          </Text>
                        </View>
                        <StatusBadge status={doc.status} />
                      </View>
                      
                      <View className="h-[1px] w-full bg-brand-border my-3" />
                      
                      <View className="flex-row justify-between items-center">
                        <Text className="text-brand-muted text-xs">
                          Updated: <Text className="text-brand-text">{new Date(doc.updatedAt).toLocaleDateString()}</Text>
                        </Text>
                        
                        {doc.status === 'pending_client_action' ? (
                          <Text className="text-brand-danger text-[10px] font-black uppercase tracking-widest">Review AI Redraft →</Text>
                        ) : (
                          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest">View Details →</Text>
                        )}
                      </View>
                    </InfoCard>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}