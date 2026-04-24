import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantStyles = {
  primary: 'bg-blue-600 border-blue-500',
  success: 'bg-emerald-600 border-emerald-500',
  danger: 'bg-red-600 border-red-500',
  ghost: 'bg-transparent border-slate-800'
};

const textStyles = {
  primary: 'text-white',
  success: 'text-white',
  danger: 'text-white',
  ghost: 'text-slate-400'
};

export default function AppButton({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading, 
  disabled, 
  className 
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      className={`h-14 w-full rounded-2xl border-b-4 items-center justify-center flex-row ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text className={`text-sm font-black uppercase tracking-[2px] ${textStyles[variant]}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}