import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  className?: string;
}

export default function InputField({ 
  label, 
  error, 
  className = '', 
  ...props 
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-5 ${className}`}>
      <Text className="text-brand-muted text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1">
        {label}
      </Text>
      
      <TextInput
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor="#57534E" // Stone-600
        className={`bg-brand-card text-brand-text text-base p-4 rounded-2xl border-2 transition-colors ${
          error 
            ? 'border-brand-danger/50' 
            : isFocused 
              ? 'border-brand-primary' 
              : 'border-brand-border'
        } ${props.multiline ? 'h-40' : 'h-14'}`}
        textAlignVertical={props.multiline ? 'top' : 'center'}
      />

      {error && (
        <Text className="text-brand-danger text-[10px] font-bold mt-2 ml-1 uppercase tracking-wide">
          {error}
        </Text>
      )}
    </View>
  );
}