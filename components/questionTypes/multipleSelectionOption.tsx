import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  onToggle: () => void;
};

export default function MultipleSelectionOption({ option, isSelected, onToggle }: Props) {
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
    onToggle();
  }, [onToggle]);

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

  // Animated styles for checkbox box border
  const checkboxBoxAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.textSecondary, colors.brandPrimary]
    );
    
    return {
      borderColor,
    };
  });

  // Animated styles for checkbox inner checkmark
  const checkboxCheckmarkAnimatedStyle = useAnimatedStyle(() => {
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
        <AnimatedView style={[styles.checkboxBox, checkboxBoxAnimatedStyle]}>
          <AnimatedView style={[styles.checkboxCheckmark, checkboxCheckmarkAnimatedStyle]}>
            <Ionicons
              name="checkmark"
              size={16}
              color={colors.brandPrimary}
            />
          </AnimatedView>
        </AnimatedView>
        <Animated.Text style={[styles.optionText, textAnimatedStyle]}>
          {option}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  );
}

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
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheckmark: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter',
    flex: 1,
    fontWeight: '500',
  },
});

