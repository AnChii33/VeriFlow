import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { veriflowApi } from '../../services/api';
import { Template } from '../../types';
import StatusBadge from '../../components/base/StatusBadge';
import InfoCard from '../../components/layout/InfoCard';
import MetricCard from '../../components/layout/MetricCard';
import AppButton from '../../components/base/AppButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getDeviceTrace } from '../../utils/platform';

export default function ClientDashboard({ route }: any) {
  const { clientId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const { isWeb } = getDeviceTrace();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await veriflowApi.getLedger();
      setTemplates(data.filter(t => t.clientId === clientId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const renderItem = ({ item }: { item: Template }) => (
    <InfoCard className="mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 mr-4">
          <Text className="text-white text-lg font-black">{item.title}</Text>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            {item.documentType} • ID: {item.id.split('-')[0]}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {item.status === 'pending_client_action' && (
        <View className="flex-row gap-x-3 mt-2">
          <AppButton 
            title="Review Redrafts" 
            variant="primary" 
            className="flex-1 h-10"
            onPress={() => navigation.navigate('AuditTrailScreen', { templateId: item.id })}
          />
        </View>
      )}
      
      {item.status === 'approved' && (
        <View className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl mt-2">
          <Text className="text-emerald-500 text-[10px] font-bold text-center uppercase tracking-widest">
            Cryptographically Certified
          </Text>
        </View>
      )}
    </InfoCard>
  );

  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center py-10" 
    : "flex-1 bg-brand-dark px-6 pt-12";

  const contentStyle = isWeb 
    ? "w-full max-w-5xl bg-brand-card p-10 rounded-3xl border border-slate-800 shadow-2xl flex-1" 
    : "w-full flex-1";

  return (
    <View className={containerStyle}>
      <View className={contentStyle}>
        <View className="mb-8">
          <Text className="text-white text-3xl font-black tracking-tighter">My Documents</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">
            VeriFlow Client Portal
          </Text>
        </View>

        <View className="flex-row gap-x-4 mb-8">
          <MetricCard label="In Progress" value={templates.filter(t => t.status !== 'approved').length} />
          <MetricCard label="Approved" value={templates.filter(t => t.status === 'approved').length} />
        </View>

        <FlatList
          data={templates}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No Documents Found</Text>
            </View>
          }
        />

        <AppButton 
          title="Submit New Template" 
          variant="primary" 
          className="mb-6 mt-4"
          onPress={() => navigation.navigate('SubmitDraft', { clientId })} 
        />
      </View>
    </View>
  );
}