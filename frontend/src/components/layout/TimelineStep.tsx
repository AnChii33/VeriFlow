import React from 'react';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
  isLast?: boolean;
}

export default function TimelineStep({ children, isLast }: Props) {
  return (
    <View className="flex-row">
      <View className="items-center mr-4">
        <View className="w-3 h-3 rounded-full bg-brand-blue z-10 shadow-lg shadow-brand-blue/50" />
        {!isLast && (
          <View className="w-[1.5px] flex-1 bg-slate-800 -mt-1" />
        )}
      </View>
      <View className={`flex-1 ${!isLast ? 'pb-10' : 'pb-2'}`}>
        {children}
      </View>
    </View>
  );
}