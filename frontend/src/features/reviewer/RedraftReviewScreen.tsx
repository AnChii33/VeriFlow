// src/features/reviewer/RedraftReviewScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import AppButton from '../../components/base/AppButton';
import VersionBox from '../../components/layout/VersionBox';
import StatusBadge from '../../components/base/StatusBadge';

export default function RedraftReviewScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { height: screenHeight } = useWindowDimensions();
  const { template, reviewerId } = route.params;
  const { isWeb } = getDeviceTrace();

  const [loading, setLoading] = useState(false);

  const hasFlags = template.flags && template.flags.length > 0;

  const handleDecision = async () => {
    setLoading(true);
    try {
      await veriflowApi.submitReviewDecision(template.id, reviewerId);
      Alert.alert("Success", "Your review decision has been recorded securely.");
      navigation.goBack(); 
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX: Root View strictly fills screen and forces hidden overflow
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
      {/* Fixed Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border flex-row justify-between items-center">
        <View className="flex-1 pr-4">
          <Text className="text-brand-text text-2xl font-black tracking-tighter" numberOfLines={1}>
            Legal Review
          </Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            Template: {template.title}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="bg-brand-dark px-4 py-2 rounded-lg border border-brand-border"
        >
          <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest">Back to Queue</Text>
        </TouchableOpacity>
      </View>

      {/* FIX: ScrollView with hardcoded flex and web overflow */}
      <ScrollView 
        style={{ flex: 1, ...(isWeb && { overflowY: 'auto' as any }) }}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: isWeb ? 32 : 16, paddingBottom: 100 }}
      >
        <View className={isWeb ? "w-full max-w-6xl mx-auto" : "w-full"}>
          
          <View className="flex-row items-center justify-between mb-6 px-2">
            <Text className="text-brand-text text-xl font-black tracking-tighter">Document Analysis</Text>
            <StatusBadge status={template.status} />
          </View>

          <View className={isWeb ? "flex-row gap-6 mb-8" : "mb-8 gap-y-4"}>
            <View className="flex-1">
              <InfoCard>
                <Text className="text-brand-muted text-[10px] uppercase font-black tracking-widest mb-1">Author / Client</Text>
                <Text className="text-brand-text font-bold text-lg">{template.client?.name || 'Unknown'}</Text>
                <Text className="text-brand-muted text-xs">{template.client?.company?.name}</Text>
              </InfoCard>
            </View>
            <View className="flex-1">
              <InfoCard>
                <Text className="text-brand-muted text-[10px] uppercase font-black tracking-widest mb-1">Document Type</Text>
                <Text className="text-brand-text font-bold text-lg">{template.documentType}</Text>
                <Text className="text-brand-muted text-xs">ID: {template.id}</Text>
              </InfoCard>
            </View>
          </View>

          <View className="mb-8">
            <VersionBox 
              label="Submitted Content" 
              content={template.content} 
              isActive={false} 
            />
          </View>

          <Text className="text-brand-text text-xl font-black tracking-tighter mb-4 px-2">System Flags</Text>
          <InfoCard className="mb-8">
            {hasFlags ? (
              template.flags.map((flag: any, index: number) => (
                <View key={flag.id || index} className={`p-4 bg-brand-dark rounded-xl border border-brand-danger/30 ${index !== template.flags.length - 1 ? 'mb-4' : ''}`}>
                  <View className="flex-row items-center mb-2">
                    <View className="w-2 h-2 rounded-full bg-brand-danger mr-2" />
                    <Text className="text-brand-danger text-xs font-black uppercase tracking-widest">
                      Section: {flag.cfr_section}
                    </Text>
                  </View>
                  <Text className="text-brand-text text-sm leading-6">
                    {flag.explanation}
                  </Text>
                </View>
              ))
            ) : (
              <View className="py-6 items-center">
                <Text className="text-brand-success font-bold text-lg mb-1">No Issues Detected</Text>
                <Text className="text-brand-muted text-center text-xs">The system analysis did not find any regulatory flags in this document.</Text>
              </View>
            )}
          </InfoCard>

          <InfoCard className="mb-12">
            <Text className="text-brand-text text-lg font-black tracking-tight mb-2">Reviewer Decision</Text>
            <Text className="text-brand-muted text-sm leading-6 mb-6">
              {hasFlags 
                ? "By confirming these flags, the document will be sent back to the system for an automated redraft to resolve the issues." 
                : "As no flags were detected, signing this will fully approve the document and finalize it in the secure ledger."}
            </Text>
            
            <AppButton 
              title={hasFlags ? "Confirm Flags & Request Redraft" : "Sign & Approve Document"} 
              variant={hasFlags ? "primary" : "success"}
              loading={loading}
              onPress={handleDecision} 
            />
          </InfoCard>

        </View>
      </ScrollView>
    </View>
  );
}