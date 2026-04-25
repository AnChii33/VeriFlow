// src/features/auth/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InputField from '../../components/base/InputField';
import AppButton from '../../components/base/AppButton';
import InfoCard from '../../components/layout/InfoCard';
import { getDeviceTrace } from '../../utils/platform';
import { veriflowApi } from '../../services/api';
import { UserRole } from '../../types';

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'CLIENT', label: 'Client' },
  { id: 'LEGAL_REVIEWER', label: 'Legal Team' },
  { id: 'ADMIN', label: 'Admin' }
];

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [loading, setLoading] = useState(false);

  const { isWeb } = getDeviceTrace();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Authentication Error", "Please provide both an email and a password.");
      return;
    }

    setLoading(true);
    try {
      const userData = await veriflowApi.login({ email, password, role });

      if (userData.role === 'CLIENT') {
        navigation.replace('ClientDashboard', { clientId: userData.id });
      } else if (userData.role === 'LEGAL_REVIEWER') {
        navigation.replace('ReviewerDashboard', { reviewerId: userData.id });
      } else if (userData.role === 'ADMIN') {
        navigation.replace('AdminPanel');
      }

    } catch (e: any) {
      Alert.alert("Access Denied", e.message || "Invalid credentials or server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = isWeb 
    ? "flex-1 bg-brand-dark items-center justify-center py-10" 
    : "flex-1 bg-brand-dark justify-center";

  const contentStyle = isWeb 
    ? "w-full max-w-md bg-brand-dark p-6" 
    : "w-full px-6";                      

  return (
    <View className={containerStyle}>
      <View className={contentStyle}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          
          <View className="mb-10 items-center">
            <Text className="text-brand-text text-4xl font-black tracking-tighter">VeriFlow</Text>
          </View>

          <InfoCard className="mb-8">
            <View className="flex-row bg-brand-dark rounded-xl p-1 mb-6 border border-brand-border">
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.8}
                  className={`flex-1 py-3 rounded-lg items-center transition-colors ${
                    role === r.id ? 'bg-brand-card border border-brand-primary/30 shadow-md' : 'bg-transparent'
                  }`}
                >
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${
                    role === r.id ? 'text-brand-primary' : 'text-brand-muted'
                  }`}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField 
              label="User Email" 
              value={email} 
              onChangeText={setEmail} 
              placeholder="someone@example.com" 
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <InputField 
              label="Password" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry
              placeholder="****" 
            />

            <AppButton 
              title="Authenticate" 
              loading={loading} 
              onPress={handleLogin} 
              className="mt-4"
            />
          </InfoCard>

          <Text className="text-brand-muted text-[10px] text-center font-black uppercase tracking-widest leading-5 px-4">
            Authorized access only. 
          </Text>

        </ScrollView>
      </View>
    </View>
  );
}