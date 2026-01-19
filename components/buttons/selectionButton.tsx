import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor, useDerivedValue, runOnJS } from 'react-native-reanimated';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
    title: string;
    selected: boolean;
    onPress: () => void;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
}

export default function SelectionButton({title, selected, onPress, activeIcon, inactiveIcon, disabled = false}: Props){
    const { colors } = useTheme();
    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
    const selectedValue = useSharedValue(selected ? 1 : 0);
    const [iconColor, setIconColor] = useState(selected ? colors.brandPrimary : colors.textSecondary);
    
    useEffect(() => {
        selectedValue.value = withTiming(selected ? 1 : 0, {duration: 200});
    }, [selected]);
    
    // Update icon color based on animated value
    const updateIconColor = useCallback((color: string) => {
        setIconColor(color);
    }, []);
    
    useDerivedValue(() => {
        const color = interpolateColor(
            selectedValue.value,
            [0, 1],
            [colors.textSecondary, colors.brandPrimary]
        );
        runOnJS(updateIconColor)(color);
    });

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    }, [onPress]);

    const animatedButtonStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            selectedValue.value,
            [0, 1],
            [colors.textSecondary, colors.brandPrimary]
        )

        const backgroundColor = interpolateColor(
            selectedValue.value,
            [0, 1],
            [colors.backgroundSecondary, colors.backgroundTertiary]
        )

        return {
            borderColor: borderColor,
            backgroundColor: backgroundColor,
        }
    })
    const animatedTextStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            selectedValue.value,
            [0, 1],
            [colors.textSecondary, colors.brandPrimary]
        )

        return {
            color: color,
        }
    })

    return(
        <AnimatedPressable
            style={[
                styles.tab,
                animatedButtonStyle
            ]}
            onPress={handlePress}
            disabled={disabled}
        >
            <Ionicons
                name={selected ? activeIcon : inactiveIcon}
                size={20}
                color={iconColor}
            />
            <Animated.Text
                style={[
                    styles.tabText,
                    animatedTextStyle
                ]}
            >
                {title}
            </Animated.Text>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Inter',
    },
})

