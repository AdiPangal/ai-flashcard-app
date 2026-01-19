import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type CustomInputProps = {
    title: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: string;
}

export default function InputBox({title, value, onChangeText, placeholder, secureTextEntry, keyboardType}: CustomInputProps){
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
            <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title}:</Text>
            <TextInput
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType as any}
                style={[styles.input, { 
                    backgroundColor: colors.backgroundSecondary, 
                    color: colors.textPrimary,
                    borderColor: isFocused ? colors.brandPrimary : colors.border 
                }]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    titleText:{
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: "Inter",
        marginTop: 10,
    },
    input:{
        width: '100%',
        fontSize: 15,
        fontFamily: "Inter",
        paddingHorizontal: 10,
        paddingVertical: 13,
        marginVertical: 5,
        borderWidth: 1,
        borderRadius: 10,
    },
    container:{
        width: '100%',
    }
})