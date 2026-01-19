import AuthenticationButton from '@/components/buttons/authenticationButton';
import GoogleButton from '@/components/buttons/googleButton';
import HorizontalLine from '@/components/horizontalLine';
import InputBox from '@/components/userInput/inputBox';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

import { Link } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

export default function SignupScreen() {
    const { auth, db } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) {
            setError('Please enter all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore with UID as document ID
            // This MUST complete before navigation
            try {
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: user.displayName || email.split('@')[0],
                    email: user.email || email,
                    lastLogin: serverTimestamp(),
                    history: {
                        flashcards: [],
                        quizzes: []
                    },
                    preferences: {
                        darkMode: true,
                        defaultQuestionCount: 10,
                        notifications: true
                    }
                });
                console.log('User document created successfully for:', user.uid);
            } catch (firestoreError: any) {
                // If Firestore creation fails, log it but don't block navigation
                // The user is still authenticated, document can be created later
                console.error('Error creating user document:', firestoreError);
                // You might want to show a warning or retry logic here
                // For now, we'll let the user proceed but log the error
            }

            // Navigation handled by _layout.tsx based on auth state
        } catch (error: any) {
            setLoading(false);
            let errorMessage = 'An error occurred during sign up';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters long';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password sign up is not enabled';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check Firestore security rules.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        }
    }

    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <View style={styles.textContainer}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Sign Up</Text>
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
                <InputBox
                    title={"Confirm Password"}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm Password"
                    secureTextEntry
                />

                <Animated.View style={[styles.errorContainer, animatedErrorStyle]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || ' '}</Text>
                </Animated.View>
                <AuthenticationButton
                    onPress={handleSignup}
                    disabled={loading}
                    title={loading ? "Signing Up..." : "Sign Up"}
                />
                <HorizontalLine />
                <Text style={[styles.loginText, { color: colors.textPrimary }]}>Already have an account? <Link style={[styles.loginLink, { color: colors.brandPrimary }]} href="/login">Log in</Link></Text>
            </View>
        </View>

    )
}

const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: '#121212',
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
        color: '#e0e0e0',
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
        color: '#e0e0e0',
    },
    loginLink: {
        color: "#1374b9",
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
        color: '#f44336',
        textAlign: 'center',
    }
});