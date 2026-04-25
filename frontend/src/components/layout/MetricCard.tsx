import React from 'react';
import { View, Text } from 'react-native';

interface MetricCardProps {
  label: string;
  value: number | string;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View className="bg-brand-card border-l-4 border-l-brand-primary border border-brand-border rounded-2xl p-5 shadow-lg">
      <Text className="text-brand-muted text-[10px] font-black uppercase tracking-[2px] mb-2">
        {label}
      </Text>
      <Text className="text-brand-text text-4xl font-black tracking-tighter">
        {value}
      </Text>
    </View>
  );
}