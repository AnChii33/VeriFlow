import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function InputField({ 
  label, 
  error, 
  className, 
  ...props 
}: Props) {
  return (
    <View className={`mb-6 ${className}`}>
      <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1">
        {label}
      </Text>
      <TextInput 
        {...props}
        placeholderTextColor="#475569"
        className={`bg-brand-dark border ${
          error ? 'border-red-900' : 'border-slate-800'
        } rounded-2xl p-4 text-slate-200 text-base ${
          props.multiline ? 'h-48 pt-4' : 'h-14'
        }`}
        textAlignVertical={props.multiline ? 'top' : 'center'}
      />
      {error && (
        <Text className="text-red-500 text-[10px] font-bold mt-2 ml-1 uppercase">
          {error}
        </Text>
      )}
    </View>
  );
}