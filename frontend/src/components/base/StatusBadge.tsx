import React from 'react';
import { View, Text } from 'react-native';
import { FSMStatus } from '../../types';

const badgeStyles = {
  pending_ai_flags: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pending_legal: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  pending_ai_redrafts: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending_client_action: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export default function StatusBadge({ status }: { status: FSMStatus }) {
  const current = badgeStyles[status] || badgeStyles.pending_ai_flags;
  const parts = current.split(' ');

  return (
    <View className={`px-3 py-1 rounded-full border ${parts[0]} ${parts[2]}`}>
      <Text className={`text-[9px] font-black uppercase tracking-widest ${parts[1]}`}>
        {status.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}