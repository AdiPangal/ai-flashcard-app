import Animated, {useAnimatedStyle, interpolateColor, useSharedValue, withTiming} from 'react-native-reanimated';
import {Pressable, Text, StyleSheet} from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';
import {useCallback} from 'react';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
    onPress: () => void;
    disabled: boolean;
    icon?: keyof typeof Ionicons.glyphMap | "";
    title: string;
    inactiveColor?: string;
    activeColor?: string;
    textColor?: string;
}

export default function SecondaryButton({onPress, disabled, icon="", title, inactiveColor, activeColor, textColor}: Props) {
    const { colors } = useTheme();
    const pressProgress = useSharedValue(0);
    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
    const defaultInactiveColor = inactiveColor || colors.backgroundSecondary;
    const defaultActiveColor = activeColor || colors.backgroundLighter;
    const buttonTextColor = textColor || colors.textPrimary;

    const handlePressIn = useCallback(() =>{
        pressProgress.value = withTiming(1, {duration: 100});
    },[]);

    const handlePressOut = useCallback(() =>{
        pressProgress.value = withTiming(0, {duration: 100});
        onPress();
    },[]);

    const animatedButtonStyle = useAnimatedStyle(() => {
        const translateY = pressProgress.value * 2;
        const backgroundColor = interpolateColor(
            pressProgress.value,
            [0, 1],
            [defaultInactiveColor, defaultActiveColor]
        );
        
        return {
            transform: [{ translateY }],
            backgroundColor,
        };
    });

    return (
        <AnimatedPressable
            style={[styles.actionButton, animatedButtonStyle]}
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            {icon && <Ionicons name={icon} size={20} color={buttonTextColor} />}
            <Text style={[styles.actionButtonText, { color: buttonTextColor }]}>{title}</Text>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 8,
      },
      actionButtonText: {
        fontSize: 16,
        fontFamily: "Inter",
        fontWeight: "600",
      },
})