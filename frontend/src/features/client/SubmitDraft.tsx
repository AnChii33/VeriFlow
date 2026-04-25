// src/features/client/SubmitDraft.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
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
  
  const { height: screenHeight } = useWindowDimensions();
  const { isWeb } = getDeviceTrace();

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Messaging Template');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    // FIX: Root View strictly fills screen and forces hidden overflow
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
      {/* Fixed Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-brand-text text-2xl font-black tracking-tighter">New Template</Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            System Entry
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="bg-brand-dark px-4 py-2 rounded-lg border border-brand-border ml-4"
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
        <View className={isWeb ? "w-full max-w-5xl mx-auto" : "w-full"}>
          
          <InfoCard className="mb-6">
            <View className={isWeb ? "flex-row gap-x-6" : ""}>
              <View className={isWeb ? "flex-1" : "w-full"}>
                <InputField 
                  label="Template Name" 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder="OPTIN" 
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
                    style={{ color: '#FAFAF9', backgroundColor: '#2c1602' }}
                  >
                    <Picker.Item label="Messaging Template" value="Messaging Template" />
                    <Picker.Item label="Legal Disclosure" value="Legal Contract" />
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
              className={isWeb ? "w-64" : ""}
            />
          </View>
          
        </View>
      </ScrollView>
    </View>
  );
}