import React from 'react';
import { View } from 'react-native';

interface TimelineStepProps {
  children: React.ReactNode;
  isLast?: boolean;
}

export default function TimelineStep({ children, isLast = false }: TimelineStepProps) {
  return (
    <View className="flex-row">
      {/* Timeline Line & Dot */}
      <View className="w-8 items-center mr-2 relative">
        <View className="w-3 h-3 rounded-full bg-brand-primary border-4 border-brand-dark z-10 mt-2" />
        {!isLast && (
          <View className="absolute top-4 bottom-0 w-0.5 bg-brand-border -mb-8" />
        )}
      </View>
      
      {/* Content */}
      <View className="flex-1 pb-8">
        {children}
      </View>
    </View>
  );
}