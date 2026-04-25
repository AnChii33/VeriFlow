import React from 'react';
import { View, ViewProps } from 'react-native';

interface InfoCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export default function InfoCard({ children, className = '', ...props }: InfoCardProps) {
  return (
    <View 
      {...props}
      className={`bg-brand-card border border-brand-border rounded-3xl p-6 shadow-xl ${className}`}
    >
      {children}
    </View>
  );
}