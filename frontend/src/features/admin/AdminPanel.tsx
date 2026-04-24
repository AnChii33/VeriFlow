import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { veriflowApi } from '../../services/api';
import { Template } from '../../types';
import StatusBadge from '../../components/base/StatusBadge';
import MetricCard from '../../components/layout/MetricCard';
import InfoCard from '../../components/layout/InfoCard';
import { getDeviceTrace } from '../../utils/platform';

export default function AdminPanel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ledger, setLedger] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const { isWeb } = getDeviceTrace();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await veriflowApi.getLedger();
      setLedger(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderItem = ({ item }: { item: Template }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('AuditTrailScreen', { templateId: item.id })}
    >
      <InfoCard className="mb-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-white text-lg font-black">{item.title}</Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              ID: {item.id.split('-')[0]} • {item.documentType}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
      </InfoCard>
    </TouchableOpacity>
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
          <Text className="text-white text-3xl font-black tracking-tighter">Global Ledger</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">System Administrator</Text>
        </View>

        <View className="flex-row gap-x-4 mb-8">
          <MetricCard label="Total Audit Records" value={ledger.length} />
          <MetricCard label="Active Transitions" value={ledger.filter(t => t.status !== 'approved').length} />
        </View>

        <FlatList
          data={ledger}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#3b82f6" />}
        />
      </View>
    </View>
  );
}