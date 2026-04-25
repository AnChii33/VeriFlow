// src/features/client/RedraftAction.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import AppButton from '../../components/base/AppButton';
import InputField from '../../components/base/InputField';
import VersionBox from '../../components/layout/VersionBox';
import StatusBadge from '../../components/base/StatusBadge';

export default function RedraftAction({ route }: any) {
  const navigation = useNavigation<any>();
  const { height: screenHeight } = useWindowDimensions();
  const { template, clientId } = route.params;
  const { isWeb } = getDeviceTrace();

  const latestRedraft = useMemo(() => {
    if (!template.redrafts || template.redrafts.length === 0) return null;
    return [...template.redrafts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [template]);

  const proposedContent = latestRedraft?.modContent || 'No AI modifications found.';

  const [loading, setLoading] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualText, setManualText] = useState(proposedContent);

  const handleAction = async (actionType: 'ACCEPT' | 'RE_SUBMIT') => {
    if (actionType === 'RE_SUBMIT' && !manualText.trim()) {
      Alert.alert("Validation", "Manual edit content cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      await veriflowApi.respondToRedraft(
        template.id, 
        actionType, 
        actionType === 'RE_SUBMIT' ? manualText : undefined
      );
      
      Alert.alert("Success", "Your decision has been logged.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Submission Failed", e.message || "Could not process your request.");
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
            Resolve Modifications
          </Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            Template: {template.title}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="bg-brand-dark px-4 py-2 rounded-lg border border-brand-border"
        >
          <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest">Cancel</Text>
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
            <Text className="text-brand-text text-xl font-black tracking-tighter">Document Revision</Text>
            <StatusBadge status={template.status} />
          </View>

          <View className={isWeb ? "flex-row gap-6 mb-8" : "mb-8 gap-y-4"}>
            <View className="flex-1">
              <VersionBox 
                label="Original Submission" 
                content={template.content} 
                isActive={false} 
              />
            </View>
            <View className="flex-1">
              <VersionBox 
                label="System Proposed Redraft" 
                content={proposedContent} 
                isActive={true} 
              />
            </View>
          </View>

          <InfoCard>
            {!isManualEdit ? (
              <View>
                <Text className="text-brand-text text-lg font-black tracking-tight mb-2">Decision Required</Text>
                <Text className="text-brand-muted text-sm leading-6 mb-8">
                  The system has identified necessary changes to your draft. You may accept the exact proposed text above, or choose to modify it yourself for another review cycle.
                </Text>
                
                <View className={isWeb ? "flex-row gap-4" : "gap-4"}>
                  <View className={isWeb ? "flex-1" : "w-full"}>
                    <AppButton 
                      title="Accept System Redraft" 
                      variant="success"
                      loading={loading}
                      onPress={() => handleAction('ACCEPT')} 
                    />
                  </View>
                  <View className={isWeb ? "flex-1" : "w-full"}>
                    <AppButton 
                      title="I want to edit manually" 
                      variant="ghost"
                      onPress={() => setIsManualEdit(true)} 
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-brand-text text-lg font-black tracking-tight mb-4">Manual Override</Text>
                
                <InputField 
                  label="Edit Content"
                  value={manualText}
                  onChangeText={setManualText}
                  multiline
                  numberOfLines={isWeb ? 12 : 8}
                />
                
                <View className={isWeb ? "flex-row gap-4 mt-4" : "gap-4 mt-4"}>
                  <View className={isWeb ? "flex-1" : "w-full"}>
                    <AppButton 
                      title="Submit for Re-Analysis" 
                      loading={loading}
                      onPress={() => handleAction('RE_SUBMIT')} 
                    />
                  </View>
                  <View className={isWeb ? "flex-1" : "w-full"}>
                    <AppButton 
                      title="Cancel Override" 
                      variant="ghost"
                      onPress={() => {
                        setIsManualEdit(false);
                        setManualText(proposedContent); 
                      }} 
                    />
                  </View>
                </View>
              </View>
            )}
          </InfoCard>

        </View>
      </ScrollView>
    </View>
  );
}