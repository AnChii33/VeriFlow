import { Platform, Dimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// A helper to quickly check if the screen is wide enough for a "dashboard" layout
export const isLargeScreen = () => {
  const { width } = Dimensions.get('window');
  return isWeb && width > 768; // 768px is the standard tablet/laptop breakpoint
};