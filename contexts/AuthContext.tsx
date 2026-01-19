import { initializeApp } from 'firebase/app';
import { Auth, User, initializeAuth, onAuthStateChanged, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

// Get Firebase configuration from environment variables
// These are set in .env file with EXPO_PUBLIC_ prefix
// Expo automatically makes EXPO_PUBLIC_* variables available via process.env
const getFirebaseConfig = () => {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
  };
};

// Firebase configuration
const firebaseConfig = getFirebaseConfig();

// Validate that required config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Please check your .env file and ensure all EXPO_PUBLIC_FIREBASE_* variables are set.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
let auth: Auth;
try {
    // @ts-ignore - firebase/auth/react-native exists at runtime but types may not be available
    const { getReactNativePersistence } = require('firebase/auth/react-native');
    if (getReactNativePersistence) {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } else {
        throw new Error('getReactNativePersistence not available');
    }
} catch (error) {
    // Fallback to getAuth if initializeAuth with persistence fails
    // Note: This will use memory persistence instead of AsyncStorage
    console.warn('Could not initialize auth with AsyncStorage persistence, using memory persistence. Error:', error);
    auth = getAuth(app);
}
const db = getFirestore(app);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userId: string | null;
  auth: Auth;
  db: Firestore;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userId: null,
  auth: auth,
  db: db,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    userId: user?.uid || null,
    auth,
    db,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

