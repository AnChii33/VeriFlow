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

export default function ReviewerDashboard({ route }: any) {
  const { reviewerId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const { isWeb } = getDeviceTrace();

  const fetchData = async () => {
    setLoading(true);
    try {
      const all = await veriflowApi.getLedger();
      setData(all.filter(t => t.status === 'pending_legal'));
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
      onPress={() => navigation.navigate('RedraftReviewScreen', { templateId: item.id, reviewerId })}
    >
      <InfoCard className="mb-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-white text-lg font-black">{item.title}</Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {item.flags.length} Compliance Flags Identified
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
          <Text className="text-white text-3xl font-black tracking-tighter">Review Queue</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">Legal Authority Portal</Text>
        </View>

        <View className="mb-8">
          <View className={isWeb ? "w-72" : "w-full"}>
            <MetricCard label="Pending Analysis" value={data.length} />
          </View>
        </View>

        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#a855f7" />}
        />
      </View>
    </View>
  );
}