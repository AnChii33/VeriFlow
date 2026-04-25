// src/features/reviewer/ReviewerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import AppButton from '../../components/base/AppButton';
import StatusBadge from '../../components/base/StatusBadge';
import MetricCard from '../../components/layout/MetricCard';

export default function ReviewerDashboard({ route }: any) {
  const navigation = useNavigation<any>();
  const { reviewerId } = route.params;
  const { isWeb } = getDeviceTrace();

  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await veriflowApi.getLegalQueue();
      setQueue(data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch the review queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchQueue();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handleReviewClick = (template: any) => {
    navigation.navigate('RedraftReviewScreen', { template, reviewerId });
  };

  // --- RESPONSIVE STYLING ---
  const containerStyle = "flex-1 bg-brand-dark";
  const contentStyle = isWeb ? "w-full max-w-5xl mx-auto p-8" : "p-4";

  // Calculate Metrics
  const totalFlags = queue.reduce((acc, doc) => acc + (doc.flags?.length || 0), 0);
  const uniqueClients = new Set(queue.map(doc => doc.clientId)).size;

  return (
    <View className={containerStyle}>
      {/* Dashboard Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border flex-row justify-between items-center">
        <View>
          <Text className="text-brand-text text-2xl font-black tracking-tighter">Legal Terminal</Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            Reviewer ID: {reviewerId.substring(0, 8)}
          </Text>
        </View>
        
        <AppButton 
          title={isWeb ? "Logout" : "Exit"} 
          variant="ghost" 
          onPress={() => navigation.replace('AuthScreen')} 
          className="w-16 sm:w-24 h-10" 
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
      >
        <View className={contentStyle}>
          {loading ? (
            <ActivityIndicator size="large" color="#EAB308" className="mt-20" />
          ) : (
            <>
              {/* Dynamic Metrics */}
              <View className={isWeb ? "flex-row gap-4 mb-8" : "mb-6 gap-y-4"}>
                <View className="flex-1"><MetricCard label="Pending Review" value={queue.length} /></View>
                <View className="flex-1"><MetricCard label="Total Flags" value={totalFlags} /></View>
                <View className="flex-1"><MetricCard label="Clients Awaiting" value={uniqueClients} /></View>
              </View>

              <Text className="text-brand-text text-xl font-black tracking-tighter mb-4 px-2">Active Queue</Text>

              {/* Empty State */}
              {queue.length === 0 ? (
                <InfoCard className="items-center py-10">
                  <Text className="text-brand-muted font-bold text-center">The queue is currently empty.</Text>
                  <Text className="text-brand-muted text-xs mt-2 text-center">All submitted documents have been processed.</Text>
                </InfoCard>
              ) : (
                /* Document List */
                queue.map((doc) => (
                  <TouchableOpacity 
                    key={doc.id} 
                    activeOpacity={0.8} 
                    onPress={() => handleReviewClick(doc)}
                  >
                    <InfoCard className="mb-4 border-brand-primary/50">
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 pr-4">
                          <Text className="text-brand-text text-lg font-black tracking-tight">{doc.title}</Text>
                          <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mt-1">
                            {doc.client?.company?.name || 'Unknown Company'} • {doc.client?.name || 'Unknown Client'}
                          </Text>
                        </View>
                        <StatusBadge status={doc.status} />
                      </View>
                      
                      <View className="h-[1px] w-full bg-brand-border my-3" />
                      
                      <View className="flex-row justify-between items-center">
                        <Text className="text-brand-muted text-xs">
                          Flags Detected: <Text className="text-brand-primary font-bold">{doc.flags?.length || 0}</Text>
                        </Text>
                        
                        <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
                          Start Review →
                        </Text>
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