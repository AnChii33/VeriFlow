// src/features/client/RedraftAction.tsx
import React, { useState, useEffect } from 'react';
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
  const { template } = route.params;
  const { isWeb } = getDeviceTrace();

  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<string>(''); 
  const [manualText, setManualText] = useState(template.content);

  useEffect(() => {
    if (template.redrafts && template.redrafts.length > 0) {
      setSelection(template.redrafts[0].id);
    } else {
      setSelection('manual');
    }
  }, [template]);

  const cleanMarkdown = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#+\s/gm, '');
  };

  const handleAction = async () => {
    const isManual = selection === 'manual';

    if (isManual && !manualText.trim()) {
      Alert.alert("Validation", "Manual edit content cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      await veriflowApi.respondToRedraft(
        template.id, 
        isManual ? 'RE_SUBMIT' : 'ACCEPT', 
        isManual ? manualText : undefined,
        isManual ? undefined : selection
      );

      Alert.alert("Success", "Your decision has been logged.");
      navigation.goBack();
    } catch(e: any) {
      Alert.alert("Submission Failed", e.message || "Could not process your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
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

          <View className="mb-8">
            <VersionBox 
              label="Original Violating Content" 
              content={template.content} 
              isActive={false} 
            />
          </View>

          <Text className="text-brand-text text-xl font-black tracking-tighter mb-4 px-2">Select Compliant Version</Text>

          {template.redrafts?.map((rd: any, idx: number) => {
            const isSelected = selection === rd.id;
            return (
              <TouchableOpacity 
                key={rd.id}
                activeOpacity={0.8}
                onPress={() => setSelection(rd.id)}
                className={`mb-4 rounded-xl border overflow-hidden ${isSelected ? 'border-brand-primary' : 'border-brand-border'}`}
              >
                <View className={`px-4 py-3 flex-row items-center justify-between border-b ${isSelected ? 'bg-brand-primary/10 border-brand-primary/20' : 'bg-brand-dark border-brand-border'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-primary' : 'text-brand-muted'}`}>
                    AI Suggestion {idx + 1}
                  </Text>
                  <View className={`w-4 h-4 rounded-full border ${isSelected ? 'border-brand-primary items-center justify-center' : 'border-brand-border'}`}>
                    {isSelected && <View className="w-2 h-2 rounded-full bg-brand-primary" />}
                  </View>
                </View>
                <View className="p-4 bg-brand-card">
                  <Text className="text-brand-text leading-6 text-sm">
                    {cleanMarkdown(rd.modContent)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setSelection('manual')}
            className={`mb-8 rounded-xl border overflow-hidden ${selection === 'manual' ? 'border-brand-primary' : 'border-brand-border'}`}
          >
            <View className={`px-4 py-3 flex-row items-center justify-between border-b ${selection === 'manual' ? 'bg-brand-primary/10 border-brand-primary/20' : 'bg-brand-dark border-brand-border'}`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${selection === 'manual' ? 'text-brand-primary' : 'text-brand-muted'}`}>
                Manual Revision
              </Text>
              <View className={`w-4 h-4 rounded-full border ${selection === 'manual' ? 'border-brand-primary items-center justify-center' : 'border-brand-border'}`}>
                {selection === 'manual' && <View className="w-2 h-2 rounded-full bg-brand-primary" />}
              </View>
            </View>
            
            <View className="p-4 bg-brand-card">
              <Text className="text-brand-muted text-xs mb-4">
                Reject the AI suggestions and write your own compliant version. This will restart the AI regulatory scan.
              </Text>
              
              {selection === 'manual' && (
                <InputField 
                  label="Edit Content"
                  value={manualText}
                  onChangeText={setManualText}
                  multiline
                  numberOfLines={isWeb ? 12 : 8}
                />
              )}
            </View>
          </TouchableOpacity>

          <InfoCard className="mb-8">
            <AppButton 
              title={selection === 'manual' ? "Submit Revision for Check" : "Accept Selected Draft"}
              onPress={handleAction}
              loading={loading}
              variant={selection === 'manual' ? "primary" : "success"}
            />
          </InfoCard>

        </View>
      </ScrollView>
    </View>
  );
}