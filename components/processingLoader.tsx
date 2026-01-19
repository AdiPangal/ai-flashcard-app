import { View, StyleSheet, Text } from 'react-native';
import CustomSpinner from './customSpinner';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  title?: string;
  message?: string;
}

export default function ProcessingLoader({ title, message }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <CustomSpinner color={colors.brandPrimary} />
      <Text style={[styles.loadingText, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.loadingText, { color: colors.textPrimary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText:{
    fontSize: 16,
    marginTop: 10,
  }
});

