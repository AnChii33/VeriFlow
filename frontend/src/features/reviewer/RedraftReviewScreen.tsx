import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { veriflowApi } from '../../services/api';
import { Template } from '../../types';
import StatusBadge from '../../components/base/StatusBadge';
import AppButton from '../../components/base/AppButton';
import InfoCard from '../../components/layout/InfoCard';
import TimelineStep from '../../components/layout/TimelineStep';
import { getDeviceTrace } from '../../utils/platform';

export default function RedraftReviewScreen({ route, navigation }: any) {
  const { templateId, reviewerId } = route.params;
  const [doc, setDoc] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  const { isWeb } = getDeviceTrace();

  useEffect(() => {
    veriflowApi.getLedger().then(res => {
      setDoc(res.find(t => t.id === templateId) || null);
    });
  }, []);

  const handleAction = async () => {
    setLoading(true);
    try {
      await veriflowApi.reviewTemplate(templateId, reviewerId);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Review Failed", "State transition error.");
    } finally {
      setLoading(false);
    }
  };

  if (!doc) return null;

  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center py-10" 
    : "flex-1 bg-brand-dark";

  const contentStyle = isWeb 
    ? "w-full max-w-5xl bg-brand-card p-10 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden" 
    : "w-full px-6 pt-12";

  return (
    <View className={containerStyle}>
      <View className={contentStyle}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="mb-6">
            <StatusBadge status={doc.status} />
            <Text className="text-white text-3xl font-black mt-2 tracking-tighter">{doc.title}</Text>
          </View>

          <View className={isWeb ? "flex-row gap-x-8" : ""}>
            <View className={isWeb ? "flex-1" : "w-full"}>
              <InfoCard className="mb-8">
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[2px] mb-3">Proposed Content</Text>
                <Text className="text-slate-300 text-base leading-6">{doc.content}</Text>
              </InfoCard>
            </View>

            <View className={isWeb ? "flex-1" : "w-full"}>
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-4">AI Flag Analysis</Text>
              {doc.flags.map((flag, i) => (
                <TimelineStep key={flag.id} isLast={i === doc.flags.length - 1}>
                  <View className="bg-brand-card/50 border border-slate-800 p-4 rounded-2xl mb-2">
                    <Text className="text-red-400 text-[10px] font-black uppercase mb-1">{flag.cfr_section}</Text>
                    <Text className="text-slate-400 text-xs leading-5">{flag.explanation}</Text>
                  </View>
                </TimelineStep>
              ))}
            </View>
          </View>

          <View className={`mt-8 mb-12 ${isWeb ? "items-center border-t border-slate-800 pt-8" : ""}`}>
            <View className={isWeb ? "w-80" : "w-full"}>
              <AppButton 
                title="Authorize Decision" 
                variant="primary" 
                loading={loading}
                onPress={handleAction} 
              />
            </View>
            <Text className="text-slate-600 text-[8px] text-center mt-4 uppercase tracking-widest leading-4">
              By authorizing, you confirm review of all flags. If flags exist, system will trigger AI redrafts. If clean, template will be approved.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}