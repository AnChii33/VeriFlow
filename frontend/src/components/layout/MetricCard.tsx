import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  trend?: string;
  className?: string;
}

export default function MetricCard({ label, value, trend, className }: Props) {
  return (
    <View className={`flex-1 bg-brand-card rounded-2xl p-5 border border-slate-800 ${className}`}>
      <Text className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">
        {label}
      </Text>
      <View className="flex-row items-baseline">
        <Text className="text-white text-2xl font-black">
          {value}
        </Text>
        {trend && (
          <Text className="ml-2 text-brand-success text-[10px] font-bold">
            {trend}
          </Text>
        )}
      </View>
    </View>
  );
}