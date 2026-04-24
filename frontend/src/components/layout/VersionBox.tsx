import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
  label: string;
  content: string;
  isActive?: boolean;
  className?: string;
}

export default function VersionBox({ label, content, isActive, className }: Props) {
  return (
    <View 
      className={`flex-1 min-h-[300px] bg-brand-card rounded-2xl border p-4 shadow-sm ${
        isActive ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-800'
      } ${className}`}
    >
      <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-slate-800/50">
        <Text className={`text-[10px] font-black uppercase tracking-widest ${
          isActive ? 'text-brand-blue' : 'text-slate-500'
        }`}>
          {label}
        </Text>
        {isActive && (
          <View className="bg-brand-blue px-2 py-0.5 rounded-md">
            <Text className="text-[8px] font-bold text-white uppercase">Active</Text>
          </View>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-slate-300 text-sm leading-6">
          {content}
        </Text>
      </ScrollView>
    </View>
  );
}