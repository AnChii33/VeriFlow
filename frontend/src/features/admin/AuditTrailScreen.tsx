// src/features/admin/AuditTrailScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InfoCard from '../../components/layout/InfoCard';
import StatusBadge from '../../components/base/StatusBadge';
import TimelineStep from '../../components/layout/TimelineStep';
import VersionBox from '../../components/layout/VersionBox';
import AppButton from '../../components/base/AppButton';
import { getDeviceTrace } from '../../utils/platform';

export default function AuditTrailScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { isWeb } = getDeviceTrace();
  
  const { template } = route.params;

  const timelineEvents = useMemo(() => {
    if (!template) return [];
    
    const logs = (template.auditLogs || []).map((log: any) => ({
      ...log,
      type: 'LOG',
      timestamp: new Date(log.createdAt).getTime()
    }));

    const sigs = (template.signatures || []).map((sig: any) => ({
      ...sig,
      type: 'SIGNATURE',
      timestamp: new Date(sig.signedAt).getTime()
    }));

    return [...logs, ...sigs].sort((a, b) => a.timestamp - b.timestamp);
  }, [template]);

  if (!template) {
    return (
      <View className="flex-1 bg-brand-dark items-center justify-center">
        <Text className="text-brand-danger font-bold">No template data provided.</Text>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} className="mt-4 w-40" />
      </View>
    );
  }

  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center py-10" 
    : "flex-1 bg-brand-dark";

  const contentStyle = isWeb 
    ? "w-full max-w-4xl px-6" 
    : "w-full px-4 pt-6";

  return (
    <View className={containerStyle}>
      <View className={contentStyle}>
        
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-brand-card p-3 rounded-xl border border-brand-border">
            <Text className="text-brand-primary text-xs font-black uppercase tracking-widest">← Back to Ledger</Text>
          </TouchableOpacity>
          <StatusBadge status={template.status} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
          
          <InfoCard className="mb-8">
            <Text className="text-brand-text text-3xl font-black tracking-tighter mb-2">{template.title}</Text>
            <Text className="text-brand-primary text-[10px] font-black uppercase tracking-[2px] mb-6">
              ID: {template.id}
            </Text>

            <View className={isWeb ? "flex-row gap-6" : "gap-4"}>
              <View className="flex-1 bg-brand-dark p-4 rounded-2xl border border-brand-border">
                <Text className="text-brand-muted text-[10px] uppercase font-black tracking-widest mb-1">Author / Client</Text>
                <Text className="text-brand-text font-bold">{template.client?.name || 'N/A'}</Text>
                <Text className="text-brand-muted text-xs">{template.client?.email}</Text>
              </View>
              <View className="flex-1 bg-brand-dark p-4 rounded-2xl border border-brand-border">
                <Text className="text-brand-muted text-[10px] uppercase font-black tracking-widest mb-1">Legal Reviewer</Text>
                <Text className="text-brand-text font-bold">{template.reviewer?.name || 'Pending Assignment'}</Text>
                <Text className="text-brand-muted text-xs">{template.reviewerId || 'N/A'}</Text>
              </View>
            </View>
          </InfoCard>

          <Text className="text-brand-text text-xl font-black tracking-tighter mb-4 px-2">Current Document State</Text>
          <View className="mb-10">
            <VersionBox label="Active Content" content={template.content} isActive={true} />
          </View>

          {/* Unified Timeline */}
          <Text className="text-brand-text text-xl font-black tracking-tighter mb-6 px-2">System Audit Trail</Text>
          <InfoCard>
            {timelineEvents.map((event, index) => {
              const isLast = index === timelineEvents.length - 1;
              const dateObj = new Date(event.timestamp);

              return (
                <TimelineStep key={event.id} isLast={isLast}>
                  <View className="bg-brand-dark p-4 rounded-2xl border border-brand-border">
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
                        {dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString()}
                      </Text>
                      {event.type === 'SIGNATURE' && (
                        <View className="bg-brand-success/10 px-2 py-0.5 rounded border border-brand-success/30">
                          <Text className="text-brand-success text-[8px] font-black uppercase tracking-widest">Signed</Text>
                        </View>
                      )}
                    </View>

                    {event.type === 'LOG' ? (
                      <>
                        <Text className="text-brand-text font-bold text-base mb-1">{event.details}</Text>
                        <Text className="text-brand-muted text-xs">
                          Actor: {event.actorType} ({event.actorId.substring(0, 8)}...)
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-brand-text font-bold text-base mb-1">Electronic Signature Appended</Text>
                        <Text className="text-brand-muted text-xs leading-5">
                          Action: {event.action}{'\n'}
                          Signatory: {event.printedName}{'\n'}
                          Intent: {event.signatureMeaning}{'\n'}
                          IP Trace: {event.ipAddress || 'Unknown'}
                        </Text>
                        <Text className="text-brand-primary/50 text-[10px] mt-2 font-mono">
                          Hash: {event.documentHash.substring(0, 32)}...
                        </Text>
                      </>
                    )}
                  </View>
                </TimelineStep>
              );
            })}
            
            {timelineEvents.length === 0 && (
              <Text className="text-brand-muted text-center py-4 font-bold tracking-wider">No audit events recorded yet.</Text>
            )}
          </InfoCard>

        </ScrollView>
      </View>
    </View>
  );
}