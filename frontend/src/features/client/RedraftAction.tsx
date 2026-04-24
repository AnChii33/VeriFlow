import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { veriflowApi } from '../../services/api';
import { Template } from '../../types';
import VersionBox from '../../components/layout/VersionBox';
import AppButton from '../../components/base/AppButton';
import InputField from '../../components/base/InputField';
import { getDeviceTrace } from '../../utils/platform';

export default function RedraftAction({ route, navigation }: any) {
  const { templateId } = route.params;
  const [template, setTemplate] = useState<Template | null>(null);
  const [manualEdit, setManualEdit] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isWeb } = getDeviceTrace();

  const fetchData = async () => {
    try {
      const data = await veriflowApi.getLedger();
      const doc = data.find(t => t.id === templateId);
      setTemplate(doc || null);
      if (doc) setManualEdit(doc.content);
    } catch (e) {
      Alert.alert("System Error", "Fetch failed");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onAccept = async () => {
    setLoading(true);
    try {
      await veriflowApi.clientRespond(templateId, 'ACCEPT');
      navigation.navigate('ClientDashboard', { clientId: template?.clientId });
    } catch (e) {
      Alert.alert("Error", "Acceptance failed");
    } finally {
      setLoading(false);
    }
  };

  const onManualSubmit = async () => {
    setLoading(true);
    try {
      await veriflowApi.clientRespond(templateId, 'RE_SUBMIT', manualEdit);
      navigation.navigate('ClientDashboard', { clientId: template?.clientId });
    } catch (e) {
      Alert.alert("Error", "Manual re-submission failed");
    } finally {
      setLoading(false);
    }
  };

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
          <Text className="text-white text-2xl font-black mb-2">Review Suggested Redraft</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-6">
            State: Pending Client Action
          </Text>

          {!showEditor ? (
            <View className="gap-y-6">
              <View className={isWeb ? "flex-row gap-x-6" : "gap-y-6"}>
                <View className="flex-1">
                  <VersionBox label="Original Draft" content={template.content} />
                </View>
                <View className="flex-1">
                  <VersionBox 
                    label="AI Redraft (Compliant)" 
                    content={template.redrafts[0]?.modContent || ''} 
                    isActive 
                  />
                </View>
              </View>
              
              <View className={`gap-y-3 mt-4 mb-10 ${isWeb ? "max-w-xs" : "w-full"}`}>
                <AppButton title="Accept and Approve" variant="success" onPress={onAccept} loading={loading} />
                <AppButton title="Edit Manually" variant="ghost" onPress={() => setShowEditor(true)} />
              </View>
            </View>
          ) : (
            <View className="mb-10">
              <InputField 
                label="Manual Redraft Editor" 
                value={manualEdit} 
                onChangeText={setManualEdit} 
                multiline 
                numberOfLines={isWeb ? 15 : 8}
                style={{ textAlignVertical: 'top' }}
              />
              <View className={`gap-y-3 ${isWeb ? "max-w-xs" : "w-full"}`}>
                <AppButton title="Re-submit to AI Analysis" variant="primary" onPress={onManualSubmit} loading={loading} />
                <AppButton title="Cancel" variant="ghost" onPress={() => setShowEditor(false)} />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}