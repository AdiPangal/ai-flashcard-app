import { View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
    color?: string;
    width?: number; 
    margin?:number; 
}


export default function HorizontalLine({color, width = 3, margin = 10}: Props){
    const { colors } = useTheme();
    const lineColor = color || colors.backgroundLighter;
    return (
        <View style={{borderBottomColor: lineColor, borderBottomWidth: width, marginVertical: margin, width: '100%' }} />
    )
}