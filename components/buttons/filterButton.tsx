import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

type FilterButtonProps = {
  onPress: () => void;
};

export default function FilterButton({ onPress }: FilterButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Ionicons name="filter" size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 48,
    // Height matches SearchBar input: paddingVertical (13*2) + line height (~22) + border (2) ≈ 48
    // Using explicit height to ensure perfect alignment
    height: 48,
  },
});
