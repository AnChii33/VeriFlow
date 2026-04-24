import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { veriflowApi } from '../../services/api';
import { Template } from '../../types';
import InfoCard from '../../components/layout/InfoCard';
import TimelineStep from '../../components/layout/TimelineStep';
import { formatDate, getDeviceTrace } from '../../utils/platform';

export default function AuditTrailScreen({ route }: any) {
  const { templateId } = route.params;
  const [template, setTemplate] = useState<Template | null>(null);

  const { isWeb } = getDeviceTrace();

  useEffect(() => {
    veriflowApi.getLedger().then(data => {
      setTemplate(data.find(t => t.id === templateId) || null);
    });
  }, []);

  if (!template) return null;

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
          <Text className="text-white text-2xl font-black mb-6">Cryptographic Ledger</Text>
          
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-4">State Transitions</Text>
          <InfoCard className="mb-8">
            {template.auditLogs.map((log, index) => (
              <TimelineStep key={log.id} isLast={index === template.auditLogs.length - 1}>
                <Text className="text-slate-200 text-xs font-bold uppercase">{log.newState}</Text>
                <Text className="text-slate-500 text-[10px] mt-1">{log.details}</Text>
                <Text className="text-slate-600 text-[8px] mt-1">{formatDate(log.createdAt)}</Text>
              </TimelineStep>
            ))}
          </InfoCard>

          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Digital Signatures (21 CFR Part 11)</Text>
          <View className={isWeb ? "flex-row flex-wrap gap-4" : ""}>
            {template.signatures.map((sig) => (
              <View 
                key={sig.id} 
                className={`bg-brand-card p-4 rounded-2xl border border-slate-800 mb-4 ${isWeb ? "flex-1 min-w-[300px]" : ""}`}
              >
                <Text className="text-brand-blue text-[10px] font-black uppercase mb-1">{sig.action}</Text>
                <Text className="text-slate-400 text-[10px] font-mono">HASH: {sig.documentHash.substring(0, 32)}...</Text>
                <Text className="text-slate-500 text-[9px] mt-2 italic">Signed by: {sig.printedName} at {formatDate(sig.signedAt)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}