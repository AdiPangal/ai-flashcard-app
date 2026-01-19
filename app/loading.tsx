import {Text, View, StyleSheet} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export default function LoadingScreen(){
    const { colors } = useTheme();
    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>AI Flashcard App</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: "100%",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    }, 
    loadingText:{
        fontSize: 32,
    }
})