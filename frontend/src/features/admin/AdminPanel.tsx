// src/features/admin/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { veriflowApi } from '../../services/api';
import { getDeviceTrace } from '../../utils/platform';
import InfoCard from '../../components/layout/InfoCard';
import InputField from '../../components/base/InputField';
import AppButton from '../../components/base/AppButton';
import StatusBadge from '../../components/base/StatusBadge';
import MetricCard from '../../components/layout/MetricCard';

type Tab = 'LEDGER' | 'ENTITIES' | 'PROVISION_USER';
type UserRole = 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN';

export default function AdminPanel({ route }: any) {
  const navigation = useNavigation<any>();
  const { isWeb } = getDeviceTrace();
  const { adminId } = route.params;
  
  const { height: screenHeight } = useWindowDimensions(); 
  
  const [activeTab, setActiveTab] = useState<Tab>('LEDGER');
  const [loading, setLoading] = useState(true);

  // Data States
  const [ledger, setLedger] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<{ clients: any[], reviewers: any[], admins: any[] }>({ clients: [], reviewers: [], admins: [] });

  // Form States
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDomain, setNewCompanyDomain] = useState('');
  
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
        setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      } else {
        const comps = await veriflowApi.getCompanies();
        const usrs = await veriflowApi.getUsers();
        
        const validComps = Array.isArray(comps) ? comps : [];
        setCompanies(validComps);
        
        // ANTI-CRASH FIX: Handle both Array (old backend) and Object (new backend) formats gracefully
        if (Array.isArray(usrs)) {
           setUsers({
             clients: usrs.filter((u: any) => u.role === 'CLIENT'),
             reviewers: usrs.filter((u: any) => u.role === 'LEGAL_REVIEWER'),
             admins: usrs.filter((u: any) => u.role === 'ADMIN')
           });
        } else {
           setUsers({
             clients: usrs?.clients || [],
             reviewers: usrs?.reviewers || [],
             admins: usrs?.admins || []
           });
        }

        if (validComps.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(validComps[0].id);
        }
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load system data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName) return Alert.alert("Validation", "Company name required.");
    try {
      await veriflowApi.createCompany({ 
        name: newCompanyName, 
        domain: newCompanyDomain.trim() || undefined 
      });
      setNewCompanyName('');
      setNewCompanyDomain('');
      fetchData();
      Alert.alert("Success", "Company registered.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await veriflowApi.deleteCompany(id);
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", "Cannot delete company. Ensure no clients are currently assigned to it.");
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
      setActiveTab('ENTITIES');
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
        <View className="flex-1"><MetricCard label="Total Records" value={ledger?.length || 0} /></View>
        <View className="flex-1"><MetricCard label="Approved" value={(ledger || []).filter(l => l.status === 'approved').length} /></View>
      </View>

      {(ledger || []).map((doc) => (
        <TouchableOpacity 
          key={doc.id} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AuditTrailScreen', { template: doc })}
        >
          <InfoCard className="mb-4">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 pr-4">
                <Text className="text-brand-text text-lg font-black tracking-tight">{doc.title}</Text>
                <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mt-1">
                  ID: {doc.id} | Type: {doc.documentType}
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
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEntities = () => (
    <View className={isWeb ? "flex-row gap-6" : ""}>
      <View className={isWeb ? "flex-1" : "mb-8"}>
        <InfoCard className="mb-6">
          <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Register Company</Text>
          <InputField 
            label="Company Name" 
            value={newCompanyName} 
            onChangeText={setNewCompanyName} 
          />
          <InputField 
            label="Company Domain (Optional)" 
            value={newCompanyDomain} 
            onChangeText={setNewCompanyDomain} 
            autoCapitalize="none"
            keyboardType="url"
          />
          <AppButton title="Add Company" onPress={handleCreateCompany} className="mt-2" />
        </InfoCard>
      </View>

      <View className={isWeb ? "flex-1" : ""}>
        <InfoCard>
          <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Active Entities</Text>
          
          <Text className="text-brand-primary text-xs font-black uppercase tracking-widest mb-2 mt-4">Companies</Text>
          {(!companies || companies.length === 0) && <Text className="text-brand-muted text-xs italic mb-2">No active companies.</Text>}
          {(companies || []).map(c => (
            <View key={c.id} className="flex-row justify-between items-center bg-brand-dark p-3 rounded-xl border border-brand-border mb-2">
              <View>
                <Text className="text-brand-text font-bold">{c.name}</Text>
                {c.domain && <Text className="text-brand-muted text-[10px] uppercase">{c.domain}</Text>}
              </View>
              <AppButton 
                title="Del" 
                variant="danger" 
                onPress={() => handleDeleteCompany(c.id)} 
                className="w-12 h-8" 
              />
            </View>
          ))}
          
          <Text className="text-brand-primary text-xs font-black uppercase tracking-widest mb-2 mt-4">Clients</Text>
          {(!users?.clients || users.clients.length === 0) && <Text className="text-brand-muted text-xs italic mb-2">No active clients.</Text>}
          {(users?.clients || []).map(u => (
            <View key={u.id} className="flex-row justify-between items-center bg-brand-dark p-3 rounded-xl border border-brand-border mb-2">
              <View>
                <Text className="text-brand-text font-bold">{u.name}</Text>
                <Text className="text-brand-muted text-[10px] uppercase">{u.company?.name} | {u.id}</Text>
              </View>
              <AppButton title="Del" variant="danger" onPress={() => handleDeleteUser(u.id, 'CLIENT')} className="w-12 h-8" />
            </View>
          ))}

          <Text className="text-brand-primary text-xs font-black uppercase tracking-widest mb-2 mt-6">Legal Team</Text>
          {(!users?.reviewers || users.reviewers.length === 0) && <Text className="text-brand-muted text-xs italic mb-2">No active reviewers.</Text>}
          {(users?.reviewers || []).map(u => (
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

  const renderProvisionUser = () => (
    <View className="w-full max-w-2xl mx-auto">
      <InfoCard>
        <Text className="text-brand-text text-xl font-black mb-4 tracking-tighter">Provision New Account</Text>
        
        <View className="flex-row bg-brand-dark rounded-xl p-1 mb-5 border border-brand-border">
          {['CLIENT', 'LEGAL_REVIEWER', 'ADMIN'].map((r) => (
            <TouchableOpacity key={r} onPress={() => setNewUserRole(r as UserRole)} className={`flex-1 py-2 rounded-lg items-center ${newUserRole === r ? 'bg-brand-card border border-brand-primary/30' : ''}`}>
              <Text className={`text-[9px] font-black uppercase tracking-widest ${newUserRole === r ? 'text-brand-primary' : 'text-brand-muted'}`}>
                {r.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {newUserRole === 'CLIENT' && (companies || []).length > 0 && (
          <View className="mb-5">
            <Text className="text-brand-muted text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Assign to Company</Text>
            <View className="flex-row flex-wrap gap-2">
              {(companies || []).map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  onPress={() => setSelectedCompanyId(c.id)} 
                  className={`px-4 py-3 rounded-xl border ${selectedCompanyId === c.id ? 'bg-brand-primary/10 border-brand-primary' : 'bg-brand-dark border-brand-border'}`}
                >
                  <Text className={selectedCompanyId === c.id ? 'text-brand-primary font-bold' : 'text-brand-muted'}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {newUserRole === 'CLIENT' && (!companies || companies.length === 0) && (
          <Text className="text-brand-danger text-xs mb-4">
            You must register a Company first before provisioning a Client.
          </Text>
        )}

        <InputField label="Full Name" value={newUserName} onChangeText={setNewUserName} />
        <InputField label="User Email" value={newUserEmail} onChangeText={setNewUserEmail} autoCapitalize="none" keyboardType="email-address" />
        <InputField label="Password" value={newUserPass} onChangeText={setNewUserPass} secureTextEntry />
        <AppButton 
          title={`Create ${newUserRole.replace('_', ' ')}`} 
          onPress={handleCreateUser} 
        />
      </InfoCard>
    </View>
  );

  return (
    <View style={{ height: screenHeight, backgroundColor: '#080808', overflow: 'hidden' }}>
      
      <View className="pt-12 pb-6 px-6 bg-brand-card border-b border-brand-border items-center flex-row justify-between">
        <View>
          <Text className="text-brand-text text-2xl font-black tracking-tighter">Admin Terminal</Text>
          <Text className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">
            Admin ID: { adminId }
          </Text>
        </View>
        
        <AppButton title="Logout" variant="ghost" onPress={() => navigation.replace('AuthScreen')} className="w-24 h-10" />
      </View>

      <View className="flex-row border-b border-brand-border bg-brand-dark">
        {['LEDGER', 'ENTITIES', 'PROVISION_USER'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as Tab)} className={`flex-1 py-4 items-center ${activeTab === tab ? 'border-b-2 border-brand-primary' : ''}`}>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-brand-primary' : 'text-brand-muted'}`}>
              {tab.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: isWeb ? 32 : 16, paddingBottom: 100 }}
      >
        <View className={isWeb ? "w-full max-w-6xl mx-auto" : "w-full"}>
          {loading ? (
            <ActivityIndicator size="large" color="#EAB308" className="mt-20" />
          ) : (
            activeTab === 'LEDGER' ? renderLedger() : 
            activeTab === 'ENTITIES' ? renderEntities() : 
            renderProvisionUser()
          )}
        </View>
      </ScrollView>
    </View>
  );
}