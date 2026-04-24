import React from 'react';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function InfoCard({ children, className }: Props) {
  return (
    <View className={`bg-brand-card rounded-3xl p-6 border border-slate-800 shadow-2xl ${className}`}>
      {children}
    </View>
  );
}