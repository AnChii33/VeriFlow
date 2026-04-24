import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker'; // Standard dependency
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
  const [password, setPassword] = useState(''); // New Password State
  const [loading, setLoading] = useState(false);

  const { isWeb } = getDeviceTrace();

  const handleSubmit = async () => {
    // Added password to the validation check
    if (!title || !content || !password) {
      Alert.alert("Validation Error", "All fields, including signing password, are required.");
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
      Alert.alert("Submission Failure", "Ledger connection failed.");
    } finally {
      setLoading(false);
    }
  };

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
          <View className="mb-8">
            <Text className="text-white text-3xl font-black tracking-tighter">New Template</Text>
            <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">21 CFR Part 11 Entry</Text>
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
              
              {/* Category Dropdown Implementation */}
              <View className={isWeb ? "flex-1" : "w-full mb-6"}>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1">
                  Category
                </Text>
                <View className="bg-brand-dark border border-slate-800 rounded-2xl h-14 justify-center px-2">
                  <Picker
                    selectedValue={docType}
                    onValueChange={(itemValue) => setDocType(itemValue)}
                    dropdownIconColor="#475569"
                    style={{ color: '#e2e8f0', backgroundColor: 'transparent' }}
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

            {/* Added Password Field */}
            <InputField 
              label="Signing Password" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry // Hides text for security
              placeholder="Confirm identity to sign ledger..."
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