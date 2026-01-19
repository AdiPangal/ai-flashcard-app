import AuthenticationButton from '@/components/buttons/authenticationButton';
import HorizontalLine from '@/components/horizontalLine';
import InputBox from '@/components/userInput/inputBox';
import GoogleButton from '@/components/buttons/googleButton';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

export default function LoginScreen() {
    const { auth, db } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const errorOpacity = useSharedValue(0);
    
    useEffect(() => {
        if (error) {
            // Fade in when error appears
            errorOpacity.value = withTiming(1, { duration: 300 });
        } else {
            // Fade out when error disappears
            errorOpacity.value = withTiming(0, { duration: 300 });
        }
    }, [error]);
    
    const animatedErrorStyle = useAnimatedStyle(() => ({
        opacity: errorOpacity.value,
    }));


    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Navigation handled by _layout.tsx based on auth state
        } catch (error: any) {
            setLoading(false);
            let errorMessage = 'An error occurred during sign in';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later';
            } else if (error.message.includes('auth/invalid-credential')) {
                errorMessage = 'Invalid email or password';
            }else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
        }
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <View style={styles.textContainer}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Login</Text>
            </View>
            <View style={styles.secondaryContainer}>
                <InputBox
                    title={"Email"}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                />
                <InputBox
                    title={"Password"}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry
                />
                <View style={styles.forgotPasswordContainer}>
                    <Text style={[styles.forgotPasswordText, { color: colors.brandPrimary }]}><Link href="/passwordRecovery" style={{ color: colors.brandPrimary }}>Forgot Password?</Link></Text>
                </View>
                <Animated.View style={[styles.errorContainer, animatedErrorStyle]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || ' '}</Text>
                </Animated.View>
                <AuthenticationButton
                    onPress={handleLogin}
                    disabled={loading}
                    title={loading ? "Logging In..." : "Login"}
                />
                <HorizontalLine />
                <Text style={[styles.signupText, { color: colors.textPrimary }]}>Don't have an account? <Link style={[styles.signupLink, { color: colors.brandPrimary }]} href="/signup">Create one</Link></Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        height: '100%',
        width: '100%',
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 70,
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
    errorContainer: {
        width: '100%',
        minHeight: 30,
        marginTop: 10,
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Inter',
        textAlign: 'center',
    }
});