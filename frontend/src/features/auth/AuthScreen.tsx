// src/features/auth/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
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
  const { height: screenHeight } = useWindowDimensions();
  const { isWeb } = getDeviceTrace();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [loading, setLoading] = useState(false);

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
        navigation.replace('AdminPanel', { adminId: userData.id });
      }

    } catch (e: any) {
      Alert.alert("Access Denied", e.message || "Invalid credentials or server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX: Root View strictly fills screen and forces hidden overflow
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      <ScrollView 
        style={{ flex: 1, ...(isWeb && { overflowY: 'auto' as any }) }}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
          padding: 24, 
          paddingTop: isWeb ? 120 : 80, 
          paddingBottom: 100, 
          alignItems: 'center' 
        }}
      >
        <View className="w-full max-w-md">
          
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
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <InputField 
              label="Password" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry
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

        </View>
      </ScrollView>
    </View>
  );
}