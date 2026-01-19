import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
    onPress: () => void;
    disabled?: boolean;
}

export default function GoogleButton({onPress, disabled = false}: Props){
    const imageSource = require("@/assets/images/googleGImage.png");
    return(
        <Pressable 
            style={[styles.button, disabled && styles.buttonDisabled]} 
            onPress={onPress}
            disabled={disabled}
        >
            <Image source={imageSource} style={styles.image}/>
            <Text style={[styles.text, disabled && styles.textDisabled]}>Continue with Google</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button:{
        backgroundColor:"#f2f2f2",
        borderRadius: 10,
        marginVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 8,
        gap: 10,
    },
    buttonDisabled:{
        opacity: 0.6,
    },
    image:{
        width: 21.5,
        height: 22,
    },
    text:{
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Inter',
      color:  "#1f1f1f",  
    },
    textDisabled:{
        opacity: 0.6,
    },
})