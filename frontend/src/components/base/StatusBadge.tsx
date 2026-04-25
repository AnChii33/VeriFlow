import React from 'react';
import { View, Text } from 'react-native';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-brand-success/10', border: 'border-brand-success', text: 'text-brand-success', label: 'Approved' };
      case 'pending_ai_flags':
      case 'pending_ai_redrafts':
        return { bg: 'bg-brand-primary/10', border: 'border-brand-primary', text: 'text-brand-primary', label: 'AI Processing' };
      case 'pending_legal':
        return { bg: 'bg-brand-primary/10', border: 'border-brand-primary', text: 'text-brand-primary', label: 'Pending Legal' };
      case 'pending_client_action':
        return { bg: 'bg-brand-danger/10', border: 'border-brand-danger', text: 'text-brand-danger', label: 'Action Required' };
      default:
        return { bg: 'bg-brand-border/30', border: 'border-brand-border', text: 'text-brand-muted', label: status };
    }
  };

  const config = getStatusConfig();

  return (
    <View className={`px-3 py-1 rounded-full border ${config.bg} ${config.border} self-start`}>
      <Text className={`${config.text} text-[10px] font-black uppercase tracking-widest`}>
        {config.label}
      </Text>
    </View>
  );
}