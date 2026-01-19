import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  question: string;
  answer: string;
  flipped: boolean;
  onFlip: () => void;
  borderColor?: string;
};

export default function FlashcardFlipCard({
  question,
  answer,
  flipped,
  onFlip,
  borderColor,
}: Props) {
  const { colors } = useTheme();
  const defaultBorderColor = borderColor || colors.brandPrimary;
  const flipProgress = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    flipProgress.value = withTiming(flipped ? 1 : 0, { duration: 400 });
  }, [flipped, flipProgress]);

  const handleTouchStart = (event: any) => {
    touchStartY.current = event.nativeEvent.pageY;
    setIsScrolling(false);
  };

  const handleTouchMove = (event: any) => {
    const deltaY = Math.abs(event.nativeEvent.pageY - touchStartY.current);
    if (deltaY > 5) {
      setIsScrolling(true);
    }
  };

  const handleTouchEnd = () => {
    if (!isScrolling) {
      onFlip();
    }
    setIsScrolling(false);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0]);
    const scale = interpolate(flipProgress.value, [0, 0.5, 1], [1, 0.95, 0.95]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1]);
    const scale = interpolate(flipProgress.value, [0, 0.5, 1], [0.95, 0.95, 1]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.backgroundSecondary, borderColor: defaultBorderColor },
            frontAnimatedStyle,
            !flipped && styles.cardVisible,
          ]}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onScrollBeginDrag={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
          >
            <View style={styles.contentPressable}>
              <Text style={[styles.cardText, { color: colors.textPrimary }]}>{question}</Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>Tap to reveal answer</Text>
            </View>
          </ScrollView>
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.backgroundSecondary, borderColor: defaultBorderColor },
            backAnimatedStyle,
            styles.cardBack,
            flipped && styles.cardVisible,
          ]}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onScrollBeginDrag={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
          >
            <View style={styles.contentPressable}>
              <Text style={[styles.cardText, { color: colors.textPrimary }]}>{answer}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    marginBottom: 20,
  },
  cardWrapper: {
    width: "100%",
    height: 300,
    position: "relative",
  },
  card: {
    borderRadius: 10,
    width: "100%",
    height: 300,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderWidth: 2,
    overflow: "hidden",
  },
  cardVisible: {
    // Visible card
  },
  cardBack: {
    // Back card specific styling if needed
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  contentPressable: {
    width: "100%",
    minHeight: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    fontSize: 20,
    fontFamily: "Inter",
    lineHeight: 28,
    textAlign: "center",
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter",
    marginTop: 15,
    fontStyle: "italic",
  },
});

