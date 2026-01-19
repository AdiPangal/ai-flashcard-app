import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
    onPress: () => void;
    disabled?: boolean;
    title: string;
}

export default function AuthenticationButton({onPress, disabled = false, title}: Props){
    const { colors } = useTheme();
    const pressProgress = useSharedValue(0);
    
    const handlePressIn = useCallback(() => {
        if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            pressProgress.value = withTiming(1, { duration: 100 });
        }
    }, [disabled]);
    
    const handlePressOut = useCallback(() => {
        if (!disabled) {
            pressProgress.value = withTiming(0, { duration: 100 });
            onPress();
        }
    }, [disabled, onPress]);
    
    const animatedButtonStyle = useAnimatedStyle(() => {
        // Move down 2px when pressed
        const translateY = pressProgress.value * 2;
        
        // Darken the color when pressed
        const backgroundColor = interpolateColor(
            pressProgress.value,
            [0, 1],
            [colors.brandPrimary, colors.brandPrimaryPressed]
        );
        
        return {
            transform: [{ translateY }],
            backgroundColor,
        };
    });
    
    return(
        <AnimatedPressable 
            style={[styles.button, animatedButtonStyle, disabled && styles.buttonDisabled]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
        >
            <Text style={[styles.buttonText, { color: '#e0e0e0' }, disabled && styles.textDisabled]}>{title}</Text>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    button:{
        padding: 10,
        marginVertical: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    buttonDisabled:{
        opacity: 0.6,
    },
    buttonText:{
        fontSize: 20,
        fontWeight: "bold",
        fontFamily: "Inter",
    },
    textDisabled:{
        opacity: 0.6,
    },
})