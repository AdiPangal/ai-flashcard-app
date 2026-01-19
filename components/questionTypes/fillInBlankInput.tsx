import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function FillInBlankInput({ value, onChangeText, placeholder = 'Type your answer here...' }: Props) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = () => {
        setIsFocused(true);
    }

    const handleBlur = () => {
        setIsFocused(false);
    }
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.backgroundSecondary,
          color: colors.textPrimary,
          borderColor: isFocused ? colors.brandPrimary : colors.border 
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline={false}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  input: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    minHeight: 50,
  },
});

