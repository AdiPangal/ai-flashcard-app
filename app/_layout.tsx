import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoadingScreen from './loading';

function RootLayoutNav() {
    const { user, loading } = useAuth();
    const { theme } = useTheme();
    const segments = useSegments();
    const router = useRouter();

    // Handle deep links for password reset
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            try {
                const parsed = Linking.parse(event.url);
                let oobCode: string | undefined;

                // Extract oobCode from query parameters (Firebase automatically adds this)
                if (parsed.queryParams?.oobCode) {
                    oobCode = parsed.queryParams.oobCode as string;
                } else if (parsed.queryParams?.oobcode) {
                    oobCode = parsed.queryParams.oobcode as string;
                }

                // Check if it's a password reset link
                // Handle Firebase URL format: https://...firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...
                // Handle custom deep link format: aiflashcardapp://reset-password?oobCode=...
                const isResetPassword = 
                    parsed.queryParams?.mode === 'resetPassword' || // Firebase format
                    parsed.hostname === 'reset-password' ||
                    parsed.path === 'reset-password' ||
                    parsed.path === '/reset-password' ||
                    parsed.path === '/resetPassword' ||
                    parsed.path?.includes('reset-password') ||
                    parsed.path?.includes('resetPassword') ||
                    parsed.path?.includes('__/auth/action'); // Firebase auth action path

                if (isResetPassword && oobCode) {
                    // Use replace instead of push to avoid back navigation issues
                    router.replace(`/resetPassword?oobCode=${encodeURIComponent(oobCode)}`);
                }
            } catch (error) {
                console.error('Error handling deep link:', error);
            }
        };

        // Handle initial URL (when app is opened from a deep link)
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        }).catch((error) => {
            console.error('Error getting initial URL:', error);
        });

        // Listen for deep links when app is already open
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Also check for deep links when app comes to foreground
        // This helps catch links when user returns to app after clicking email link
        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
                // Check if there's a pending URL when app becomes active
                Linking.getInitialURL().then((url) => {
                    if (url) {
                        handleDeepLink({ url });
                    }
                }).catch(() => {});
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
            appStateSubscription.remove();
        };
    }, [router]);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(authenticated)';

        if (user && !inAuthGroup) {
            router.replace('/');
        } else if (!user && inAuthGroup) {
            router.replace('/login');
        }
    }, [user, segments, loading]);

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
            <Stack screenOptions={{ headerShown: false }} />
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <RootLayoutNav />
            </ThemeProvider>
        </AuthProvider>
    );
}
