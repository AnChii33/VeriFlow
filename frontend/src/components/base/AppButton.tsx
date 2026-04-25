import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  className?: string;
}

export default function AppButton({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false,
  className = '' 
}: AppButtonProps) {
  
  const baseStyles = "w-full h-14 rounded-xl flex-row items-center justify-center transition-colors";
  
  const variants = {
    primary: "bg-brand-primary active:bg-brand-primaryDark",
    ghost: "bg-transparent border-2 border-brand-border active:bg-brand-border/30",
    danger: "bg-brand-danger/10 border border-brand-danger active:bg-brand-danger/20",
    success: "bg-brand-success active:bg-brand-success/80",
  };

  const textStyles = {
    primary: "text-brand-dark font-black tracking-widest uppercase", // Black text on Yellow button
    ghost: "text-brand-muted font-bold tracking-wider",
    danger: "text-brand-danger font-bold tracking-wider",
    success: "text-brand-dark font-black tracking-widest uppercase",
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={loading}
      activeOpacity={0.8}
      className={`${baseStyles} ${variants[variant]} ${className} ${loading ? 'opacity-70' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'success' ? '#080808' : '#EAB308'} />
      ) : (
        <Text className={textStyles[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}