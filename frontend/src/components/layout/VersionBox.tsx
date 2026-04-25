import React from 'react';
import { View, Text } from 'react-native';

interface VersionBoxProps {
  label: string;
  content: string;
  isActive?: boolean;
}

export default function VersionBox({ label, content, isActive = false }: VersionBoxProps) {
  return (
    <View className={`rounded-2xl border-2 p-5 ${
      isActive 
        ? 'bg-brand-primary/5 border-brand-primary' 
        : 'bg-brand-card border-brand-border'
    }`}>
      <View className="flex-row items-center mb-3">
        <View className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-brand-primary' : 'bg-brand-muted'}`} />
        <Text className={`text-[10px] font-black uppercase tracking-[2px] ${
          isActive ? 'text-brand-primary' : 'text-brand-muted'
        }`}>
          {label}
        </Text>
      </View>
      <Text className="text-brand-text text-base leading-6">
        {content}
      </Text>
    </View>
  );
}