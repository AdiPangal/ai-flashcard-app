import { useEffect } from 'react';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';

type Props = {
    size?: number;
    color?: string;
}

export default function CustomSpinner({ size= 40, color= '#E0E0E0' }: Props) {
    const rotation = useSharedValue(0);

    useEffect(() =>{
        rotation.value = withRepeat(
            withTiming(360, {duration: 1000}),
            -1,
            false
        );
    }, [])
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{rotate: `${rotation.value}deg`}],
        }
    })
    return (
        <Animated.View style={[
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: color,
                borderWidth: 3,
                borderTopColor: 'transparent',
            },
            animatedStyle,
        ]}>
        </Animated.View>
    )
}
