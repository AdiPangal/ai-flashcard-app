import AuthenticationButton from '@/components/buttons/authenticationButton';
import HorizontalLine from '@/components/horizontalLine';
import InputBox from '@/components/userInput/inputBox';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export default function PasswordRecoveryScreen(){
    const { auth } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    
    const errorOpacity = useSharedValue(0);
    const successOpacity = useSharedValue(0);
    
    useEffect(() => {
        if (error) {
            // Fade in when error appears
            errorOpacity.value = withTiming(1, { duration: 300 });
            successOpacity.value = withTiming(0, { duration: 300 });
        } else {
            // Fade out when error disappears
            errorOpacity.value = withTiming(0, { duration: 300 });
        }
    }, [error]);
    
    useEffect(() => {
        if (success) {
            // Fade in when success message appears
            successOpacity.value = withTiming(1, { duration: 300 });
            errorOpacity.value = withTiming(0, { duration: 300 });
        } else {
            // Fade out when success message disappears
            successOpacity.value = withTiming(0, { duration: 300 });
        }
    }, [success]);
    
    const animatedErrorStyle = useAnimatedStyle(() => ({
        opacity: errorOpacity.value,
    }));
    
    const animatedSuccessStyle = useAnimatedStyle(() => ({
        opacity: successOpacity.value,
    }));
    
    const handlePasswordRecovery = async () => {
        if (!email) {
            setError('Please enter your email address');
            setSuccess('');
            return;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setSuccess('');
            return;
        }
        
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('Password reset email sent! Check your inbox and click the link to reset your password.');
            setEmail(''); // Clear email field after successful send
        } catch (error: any) {
            setLoading(false);
            let errorMessage = 'An error occurred while sending the reset email';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please try again later';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            setSuccess('');
        } finally {
            setLoading(false);
        }
    }
    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <View style={styles.textContainer}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Password Recovery</Text>
            </View>
            <View style={styles.secondaryContainer}>
                <InputBox
                    title={"Email"}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                />

                <Animated.View style={[styles.messageContainer, animatedErrorStyle]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || ' '}</Text>
                </Animated.View>
                <Animated.View style={[styles.messageContainer, animatedSuccessStyle]}>
                    <Text style={[styles.successText, { color: colors.success }]}>{success || ' '}</Text>
                </Animated.View>
                <AuthenticationButton
                    onPress={handlePasswordRecovery}
                    disabled={loading}
                    title={loading ? "Sending Reset Email..." : "Send Reset Email"}
                />
                <HorizontalLine />
                <Text style={[styles.signupText, { color: colors.textPrimary }]}>Remember your password? <Link style={[styles.signupLink, { color: colors.brandPrimary }]} href="/login">Login</Link></Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    mainContainer: {
        height: '100%',
        width: '100%',
    },
    textContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 70,
    },
    titleText: {
        fontSize: 50,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        marginBottom: 20,
        textAlign: 'center',
        width: '100%',
    },
    secondaryContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60%',
        paddingHorizontal: 30,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: 'Inter',
        textDecorationLine: 'underline',
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        width: '100%',
        marginTop: 5,
    },
    signupText: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    signupLink: {
        textDecorationLine: 'underline',
    },
    messageContainer: {
        width: '100%',
        minHeight: 30,
        marginTop: 10,
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Inter',
        textAlign: 'center',
    },
    successText: {
        fontSize: 14,
        fontFamily: 'Inter',
        textAlign: 'center',
    }
});