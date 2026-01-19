import { View, StyleSheet } from "react-native";
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  confidenceLevel: number; // 0-5
};

export default function FlashcardConfidenceIndicator({
  confidenceLevel,
}: Props) {
  const { colors } = useTheme();
  const dots = Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < confidenceLevel;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          { backgroundColor: isFilled ? colors.brandPrimary : colors.border },
        ]}
      />
    );
  });

  return <View style={styles.container}>{dots}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

