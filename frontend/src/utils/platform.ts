import { Platform } from 'react-native';

export const getDeviceTrace = () => {
  return {
    os: Platform.OS,
    version: Platform.Version,
    isWeb: Platform.OS === 'web'
  };
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};