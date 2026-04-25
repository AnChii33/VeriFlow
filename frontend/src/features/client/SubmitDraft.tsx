// src/features/client/SubmitDraft.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker'; 
import { veriflowApi } from '../../services/api';
import InputField from '../../components/base/InputField';
import AppButton from '../../components/base/AppButton';
import InfoCard from '../../components/layout/InfoCard';
import { getDeviceTrace } from '../../utils/platform';

export default function SubmitDraft({ route }: any) {
  const { clientId } = route.params;
  const navigation = useNavigation();
  
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Messaging Template');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const { isWeb } = getDeviceTrace();

  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert("Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);
    try {
      await veriflowApi.submitTemplate({
        title,
        documentType: docType,
        content,
        clientId
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Submission Failure", "System connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center py-10" 
    : "flex-1 bg-brand-dark";

  const contentStyle = isWeb 
    ? "w-full max-w-5xl px-6" 
    : "w-full px-6 pt-12";

  return (
    <View className={containerStyle}>
      <View className={contentStyle}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="mb-8">
            <Text className="text-brand-text text-3xl font-black tracking-tighter">New Template</Text>
            <Text className="text-brand-muted text-[10px] font-black uppercase tracking-[4px]">System Entry</Text>
          </View>

          <InfoCard className="mb-6">
            <View className={isWeb ? "flex-row gap-x-6" : ""}>
              <View className={isWeb ? "flex-1" : "w-full"}>
                <InputField 
                  label="Template Name" 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder="e.g. Transactional_OTP_V1" 
                />
              </View>
              
              <View className={isWeb ? "flex-1" : "w-full mb-6"}>
                <Text className="text-brand-muted text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1">
                  Category
                </Text>
                <View className="bg-brand-card border-2 border-brand-border rounded-2xl h-14 justify-center px-2">
                  <Picker
                    selectedValue={docType}
                    onValueChange={(itemValue) => setDocType(itemValue)}
                    dropdownIconColor="#EAB308"
                    // FIXED: Removed outline and border props
                    style={{ color: '#FAFAF9', backgroundColor: 'transparent' }}
                  >
                    <Picker.Item label="Messaging Template" value="Messaging Template" />
                    <Picker.Item label="Legal Disclosure" value="Legal Disclosure" />
                    <Picker.Item label="Privacy Policy" value="Privacy Policy" />
                    <Picker.Item label="Consent Form" value="Consent Form" />
                  </Picker>
                </View>
              </View>
            </View>
            
            <InputField 
              label="Message Body" 
              value={content} 
              onChangeText={setContent} 
              multiline 
              numberOfLines={isWeb ? 10 : 5}
              placeholder="Enter the template content here..."
            />
          </InfoCard>

          <View className={isWeb ? "items-end" : "w-full"}>
            <AppButton 
              title="Sign and Submit" 
              loading={loading} 
              onPress={handleSubmit} 
              className={isWeb ? "w-64 mb-10" : "mb-10"}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}