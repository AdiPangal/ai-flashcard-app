import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  current: number;
  total: number;
};

export default function QuizProgressBar({ current, total }: Props) {
  const { colors } = useTheme();
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming((current / total) * 100, { duration: 300 });
  }, [current, total]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value}%`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.progressContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Animated.View style={[styles.progressBar, { backgroundColor: colors.brandPrimary }, animatedProgressStyle]} />
      </View>
      <Text style={[styles.progressText, { color: colors.textPrimary }]}>
        {current}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 15,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
});

