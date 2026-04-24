import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import AppButton from '../../components/base/AppButton';
import InputField from '../../components/base/InputField';
import { getDeviceTrace } from '../../utils/platform';

export default function AuthScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userId, setUserId] = useState('user-123');
  
  // Pulling from the utility you correctly pointed out
  const { isWeb } = getDeviceTrace();

  // Platform-specific styling logic
  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center justify-center p-4" 
    : "flex-1 bg-brand-dark px-8 justify-center";

  const cardStyle = isWeb 
    ? "w-full max-w-md bg-brand-card p-10 rounded-3xl border border-slate-800 shadow-2xl" 
    : "w-full mt-10";

  return (
    <View className={containerStyle}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className={cardStyle}
      >
        <View className="mb-10 items-center">
          <View className="w-16 h-16 bg-blue-600 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-blue-500/50">
            <Text className="text-white text-3xl font-black">V</Text>
          </View>
          <Text className="text-white text-4xl font-black tracking-tighter">VeriFlow</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[6px] mt-2 text-center">
            Compliance Engine
          </Text>
        </View>

        <View className="mb-4">
          <InputField 
            label="Identity Reference" 
            value={userId} 
            onChangeText={setUserId} 
            placeholder="Enter ID..."
          />
        </View>

        <View className="gap-y-4 mt-2">
          <AppButton 
            title="Login to Workspace" 
            onPress={() => navigation.navigate('ClientDashboard', { clientId: userId })} 
          />
          
          <View className={isWeb ? "flex-row gap-x-4" : "gap-y-4"}>
            <View className={isWeb ? "flex-1" : "w-full"}>
              <AppButton 
                title="Legal Queue" 
                variant="ghost"
                onPress={() => navigation.navigate('ReviewerDashboard', { reviewerId: userId })} 
              />
            </View>
            <View className={isWeb ? "flex-1" : "w-full"}>
              <AppButton 
                title="Admin Ledger" 
                variant="ghost"
                onPress={() => navigation.navigate('AdminPanel')} 
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}