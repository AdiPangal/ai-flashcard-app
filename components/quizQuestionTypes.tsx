import {Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
    selectedTypes: string[];
    onToggleType: (type: string) => void;
}

const QUESTION_TYPES = [
    'Multiple Choice',
    'Multiple Selection',
    'Fill in the Blank',
];

function QuizQuestionTypeButton({type, isSelected, onToggleType}: {type: string, isSelected: boolean, onToggleType: (type: string) => void}) {
    const { colors } = useTheme();
    const active = useSharedValue(0);
    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
    const AnimatedText = Animated.createAnimatedComponent(Text);
    const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

    useEffect(() => {
        active.value = withTiming(isSelected ? 1 : 0, {duration: 300});
    }, [isSelected]);

    const animatedButtonStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(active.value, [0, 1], [colors.backgroundSecondary, colors.brandPrimaryDark]);
        const borderColor = interpolateColor(active.value, [0, 1], [colors.border, colors.brandPrimary]);
        return {
            backgroundColor,
            borderColor,
        }
    })

    const animatedTextStyle = useAnimatedStyle(() =>{
        const color = interpolateColor(active.value, [0, 1], [colors.textSecondary, colors.textPrimary]);
        return {
            color,
        }
    })
    const animatedIconStyle = useAnimatedStyle(() =>{
        const color = interpolateColor(active.value, [0, 1], [colors.textSecondary, colors.brandPrimary]);
        return {
            color,
        }
    })

    return (
        <AnimatedPressable
            style={[
                styles.typeButton,
                animatedButtonStyle
            ]}
            onPress={() =>onToggleType(type)}
        >
            <AnimatedIcon
                name={isSelected ? 'checkbox' : 'checkbox-outline'}
                style={[animatedIconStyle]} size={20}
            />
            <AnimatedText style={[styles.typeText,animatedTextStyle]}>
                {type}
            </AnimatedText>
        </AnimatedPressable>
    )
}

export default function QuizQuestionTypes({selectedTypes, onToggleType}: Props){
    const { colors } = useTheme();
    return (
        <View style={styles.container}>
            <Text style={[styles.titleText, { color: colors.textPrimary }]}>Types of Questions:</Text>
            <View style={styles.typesContainer}>
                {QUESTION_TYPES.map((type) => {
                    const isSelected = selectedTypes.includes(type);
                    return (
                            <QuizQuestionTypeButton key={type} type={type} isSelected={isSelected} onToggleType={onToggleType} />
                        
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 10,
    },
    titleText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: "Inter",
        marginBottom: 10,
    },
    typesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
});

