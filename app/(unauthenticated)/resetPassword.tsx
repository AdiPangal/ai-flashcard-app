import AuthenticationButton from '@/components/buttons/authenticationButton';
import HorizontalLine from '@/components/horizontalLine';
import InputBox from '@/components/userInput/inputBox';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { confirmPasswordReset } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

export default function ResetPasswordScreen() {
    const { auth } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ oobCode?: string }>();
    const oobCode = params.oobCode;
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const errorOpacity = useSharedValue(0);
    const successOpacity = useSharedValue(0);
    
    useEffect(() => {
        // Check if oobCode is missing
        if (!oobCode) {
            setError('Invalid reset link. Please request a new password reset email.');
        }
    }, [oobCode]);
    
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

    const handleResetPassword = async () => {
        if (!oobCode) {
            setError('Invalid reset link. Please request a new password reset email.');
            return;
        }
        
        if (!password || !confirmPassword) {
            setError('Please enter all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password should be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess('Password reset successful! Redirecting to login...');
            
            // Navigate to login after 2 seconds
            setTimeout(() => {
                router.replace('/login');
            }, 2000);
        } catch (error: any) {
            setLoading(false);
            let errorMessage = 'An error occurred while resetting your password';
            
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = 'Invalid or expired reset link. Please request a new password reset email.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters long';
            } else if (error.code === 'auth/expired-action-code') {
                errorMessage = 'This reset link has expired. Please request a new password reset email.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'User account not found';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            setSuccess('');
        }
    }


    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <View style={styles.textContainer}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Reset Password</Text>
            </View>
            <View style={styles.secondaryContainer}>
                <InputBox
                    title={"New Password"}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="New Password"
                    secureTextEntry
                />
                <InputBox
                    title={"Confirm New Password"}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm New Password"
                    secureTextEntry
                />
                <Animated.View style={[styles.messageContainer, animatedErrorStyle]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || ' '}</Text>
                </Animated.View>
                <Animated.View style={[styles.messageContainer, animatedSuccessStyle]}>
                    <Text style={[styles.successText, { color: colors.success }]}>{success || ' '}</Text>
                </Animated.View>
                <AuthenticationButton
                    onPress={handleResetPassword}
                    disabled={loading || !oobCode}
                    title={loading ? "Resetting Password..." : "Reset Password"}
                />
                <HorizontalLine />
                <Text style={[styles.loginText, { color: colors.textPrimary }]}>Remember your password? <Link style={[styles.loginLink, { color: colors.brandPrimary }]} href="/login">Log in</Link></Text>
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
        marginTop: 70,
        marginHorizontal: 'auto',
    },
    titleText: {
        fontSize: 50,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        marginBottom: 20,
    },
    secondaryContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60%',
        paddingHorizontal: 30,
    },
    loginText: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    loginLink: {
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