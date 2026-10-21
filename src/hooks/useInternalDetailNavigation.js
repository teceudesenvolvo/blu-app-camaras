import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useInternalDetailNavigation(navigation, isDetailOpen, closeDetail) {
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: !isDetailOpen });
  }, [isDetailOpen, navigation]);

  useEffect(() => {
    if (!isDetailOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDetail();
      return true;
    });
    return () => subscription.remove();
  }, [closeDetail, isDetailOpen]);
}
