// src/features/admin/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import InputField from '../../components/base/InputField';
import AppButton from '../../components/base/AppButton';
import StatusBadge from '../../components/base/StatusBadge';
import MetricCard from '../../components/layout/MetricCard';

type Tab = 'LEDGER' | 'ENTITIES';
type UserRole = 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN';

export default function AdminPanel() {
  const navigation = useNavigation<any>();
  const { isWeb } = getDeviceTrace();
  
  const [activeTab, setActiveTab] = useState<Tab>('LEDGER');
  const [loading, setLoading] = useState(true);

  // Data States
  const [ledger, setLedger] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<{ clients: any[], reviewers: any[], admins: any[] }>({ clients: [], reviewers: [], admins: [] });

  // Form States
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CLIENT');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'LEDGER') {
        const ledgerData = await veriflowApi.getAdminLedger();
        setLedger(ledgerData);
      } else {
        const comps = await veriflowApi.getCompanies();
        const usrs = await veriflowApi.getUsers();
        setCompanies(comps);
        setUsers(usrs);
        if (comps.length > 0 && !selectedCompanyId) setSelectedCompanyId(comps[0].id);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load system data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName) return Alert.alert("Validation", "Company name required.");
    try {
      await veriflowApi.createCompany({ name: newCompanyName });
      setNewCompanyName('');
      fetchData();
      Alert.alert("Success", "Company registered.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPass) return Alert.alert("Validation", "All fields required.");
    if (newUserRole === 'CLIENT' && !selectedCompanyId) return Alert.alert("Validation", "Select a company for the client.");
    
    try {
      await veriflowApi.createUser({
        role: newUserRole,
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        companyId: newUserRole === 'CLIENT' ? selectedCompanyId : undefined
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      fetchData();
      Alert.alert("Success", "User provisioned and secured.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    try {
      await veriflowApi.deleteUser(id, role);
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", "Cannot delete user. They may have existing ledger records.");
    }
  };

  const renderLedger = () => (
    <View>
      <View className={isWeb ? "flex-row gap-4 mb-6" : "mb-6 gap-y-4"}>
        <View className="flex-1"><MetricCard label="Total Records" value={ledger.length} /></View>
        <View className="flex-1"><MetricCard label="Approved" value={ledger.filter(l => l.status === 'approved').length} /></View>
      </View>

      {ledger.map((doc) => (
        <InfoCard key={doc.id} className="mb-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 pr-4">
              <Text className="text-brand-text text-lg font-black tracking-tight">{doc.title}</Text>
              <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mt-1">
                ID: {doc.id.substring(0, 8)} | Type: {doc.documentType}
              </Text>
            </View>
            <StatusBadge status={doc.status} />
          </View>
          <View className="h-[1px] w-full bg-brand-border my-3" />
          <View className="flex-row justify-between">
            <Text className="text-brand-muted text-xs">
              Client: <Text className="text-brand-text font-bold">{doc.client?.name || 'Unknown'}</Text>
            </Text>
            <Text className="text-brand-muted text-xs">
              Last Update: <Text className="text-brand-text">{new Date(doc.updatedAt).toLocaleDateString()}</Text>
            </Text>
          </View>
        </InfoCard>
      ))}
    </View>
  );

  const renderEntities = () => (
    <View className={isWeb ? "flex-row gap-6" : ""}>
      {/* Left Column: Creators */}
      <View className={isWeb ? "flex-1" : "mb-8"}>
        <InfoCard className="mb-6">
          <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Register Company</Text>
          <InputField label="Company Name" value={newCompanyName} onChangeText={setNewCompanyName} placeholder="e.g. Acme Corp" />
          <AppButton title="Add Company" onPress={handleCreateCompany} />
        </InfoCard>

        <InfoCard>
          <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Provision User</Text>
          
          {/* Role Selector */}
          <View className="flex-row bg-brand-dark rounded-xl p-1 mb-5 border border-brand-border">
            {['CLIENT', 'LEGAL_REVIEWER', 'ADMIN'].map((r) => (
              <TouchableOpacity key={r} onPress={() => setNewUserRole(r as UserRole)} className={`flex-1 py-2 rounded-lg items-center ${newUserRole === r ? 'bg-brand-card border border-brand-primary/30' : ''}`}>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${newUserRole === r ? 'text-brand-primary' : 'text-brand-muted'}`}>
                  {r.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {newUserRole === 'CLIENT' && companies.length > 0 && (
            <View className="mb-5">
              <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Assign to Company</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {companies.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setSelectedCompanyId(c.id)} className={`mr-2 px-4 py-3 rounded-xl border ${selectedCompanyId === c.id ? 'bg-brand-primary/10 border-brand-primary' : 'bg-brand-dark border-brand-border'}`}>
                    <Text className={selectedCompanyId === c.id ? 'text-brand-primary font-bold' : 'text-brand-muted'}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <InputField label="Full Name" value={newUserName} onChangeText={setNewUserName} placeholder="John Doe" />
          <InputField label="System Email" value={newUserEmail} onChangeText={setNewUserEmail} autoCapitalize="none" keyboardType="email-address" />
          <InputField label="Passkey" value={newUserPass} onChangeText={setNewUserPass} secureTextEntry />
          <AppButton title="Create Account" onPress={handleCreateUser} />
        </InfoCard>
      </View>

      {/* Right Column: System Overview */}
      <View className={isWeb ? "flex-1" : ""}>
        <InfoCard>
          <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Active Entities</Text>
          
          <Text className="text-brand-primary text-xs font-black uppercase tracking-widest mb-2 mt-4">Clients</Text>
          {users.clients.map(u => (
            <View key={u.id} className="flex-row justify-between items-center bg-brand-dark p-3 rounded-xl border border-brand-border mb-2">
              <View>
                <Text className="text-brand-text font-bold">{u.name}</Text>
                <Text className="text-brand-muted text-[10px] uppercase">{u.company?.name} | {u.id}</Text>
              </View>
              <AppButton title="Del" variant="danger" onPress={() => handleDeleteUser(u.id, 'CLIENT')} className="w-12 h-8" />
            </View>
          ))}

          <Text className="text-brand-primary text-xs font-black uppercase tracking-widest mb-2 mt-6">Legal Team</Text>
          {users.reviewers.map(u => (
            <View key={u.id} className="flex-row justify-between items-center bg-brand-dark p-3 rounded-xl border border-brand-border mb-2">
              <View>
                <Text className="text-brand-text font-bold">{u.name}</Text>
                <Text className="text-brand-muted text-[10px] uppercase">{u.id}</Text>
              </View>
              <AppButton title="Del" variant="danger" onPress={() => handleDeleteUser(u.id, 'LEGAL_REVIEWER')} className="w-12 h-8" />
            </View>
          ))}
        </InfoCard>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Header */}
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border items-center flex-row justify-between">
        <View>
          <Text className="text-brand-text text-2xl font-black tracking-tighter">Admin Terminal</Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">System Oversight</Text>
        </View>
        <AppButton title="Logout" variant="ghost" onPress={() => navigation.replace('AuthScreen')} className="w-24 h-10" />
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-brand-border">
        {['LEDGER', 'ENTITIES'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as Tab)} className={`flex-1 py-4 items-center ${activeTab === tab ? 'border-b-2 border-brand-primary' : ''}`}>
            <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === tab ? 'text-brand-primary' : 'text-brand-muted'}`}>
              {tab.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={isWeb ? "w-full max-w-6xl mx-auto p-8" : "p-4"}>
          {loading ? (
            <ActivityIndicator size="large" color="#EAB308" className="mt-20" />
          ) : (
            activeTab === 'LEDGER' ? renderLedger() : renderEntities()
          )}
        </View>
      </ScrollView>
    </View>
  );
}