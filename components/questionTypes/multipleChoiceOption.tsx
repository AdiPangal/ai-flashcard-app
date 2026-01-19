import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  interpolateColor, 
  useAnimatedStyle, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  option: string;
  isSelected: boolean;
  onSelect: () => void;
};

export default function MultipleChoiceOption({ option, isSelected, onSelect }: Props) {
  const { colors } = useTheme();
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const AnimatedView = Animated.createAnimatedComponent(View);
  
  const progress = useSharedValue(isSelected ? 1 : 0);
  const pressProgress = useSharedValue(0);
  
  // Update progress when isSelected changes
  useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);
  
  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pressProgress.value = withTiming(1, { duration: 100 });
  }, []);
  
  const handlePressOut = useCallback(() => {
    pressProgress.value = withTiming(0, { duration: 100 });
    onSelect();
  }, [onSelect]);

  // Animated styles for container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.backgroundSecondary, colors.brandPrimaryDark]
    );
    
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.brandPrimary]
    );
    
    return {
      backgroundColor,
      borderColor,
    };
  });

  // Animated styles for text
  const textAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [colors.textSecondary, colors.textPrimary]
    );
    
    return {
      color,
    };
  });

  // Animated styles for radio button border
  const radioButtonAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.textSecondary, colors.brandPrimary]
    );
    
    return {
      borderColor,
    };
  });

  // Animated styles for radio button inner circle
  const radioButtonInnerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0, 1]);
    const opacity = progress.value;
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for press feedback
  const pressAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressProgress.value, [0, 1], [1, 0.97]);
    const opacity = interpolate(pressProgress.value, [0, 1], [1, 0.9]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <AnimatedPressable
      style={[styles.container, containerAnimatedStyle, pressAnimatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.content}>
        <AnimatedView style={[styles.radioButton, radioButtonAnimatedStyle]}>
          <AnimatedView style={[styles.radioButtonInner, { backgroundColor: colors.brandPrimary }, radioButtonInnerAnimatedStyle]} />
        </AnimatedView>
        <Animated.Text style={[styles.optionText, textAnimatedStyle]}>
          {option}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  );
}
// 1a2a3a

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter',
    flex: 1,
    fontWeight: '500',
  },
});

