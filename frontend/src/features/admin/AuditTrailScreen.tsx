// src/features/admin/AuditTrailScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InfoCard from '../../components/layout/InfoCard';
import StatusBadge from '../../components/base/StatusBadge';
import TimelineStep from '../../components/layout/TimelineStep';
import VersionBox from '../../components/layout/VersionBox';
import AppButton from '../../components/base/AppButton';
import { getDeviceTrace } from '../../utils/platform';

export default function AuditTrailScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { height: screenHeight } = useWindowDimensions();
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
      <View style={{ height: screenHeight, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}>
        <Text className="text-brand-danger font-bold">No template data provided.</Text>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} className="mt-4 w-40" />
      </View>
    );
  }

  return (
    // FIX: Root View strictly fills screen and forces hidden overflow
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
      {/* Fixed Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="bg-brand-dark px-4 py-2 rounded-xl border border-brand-border"
        >
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest">← Back to Ledger</Text>
        </TouchableOpacity>
        <StatusBadge status={template.status} />
      </View>

      {/* FIX: ScrollView with hardcoded flex and web overflow */}
      <ScrollView 
        style={{ flex: 1, ...(isWeb && { overflowY: 'auto' as any }) }}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: isWeb ? 32 : 16, paddingBottom: 100 }}
      >
        <View className={isWeb ? "w-full max-w-4xl mx-auto" : "w-full"}>
          
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

          <Text className="text-brand-text text-xl font-black tracking-tighter mb-6 px-2">System Audit Trail</Text>
          <InfoCard>
            {timelineEvents.map((event, index) => {
              const isLast = index === timelineEvents.length - 1;
              const dateObj = new Date(event.timestamp);

              return (
                <TimelineStep key={event.id || index} isLast={isLast}>
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
                          Actor: {event.actorType} ({event.actorId})
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
                          Hash: {event.documentHash}...
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

        </View>
      </ScrollView>
    </View>
  );
}