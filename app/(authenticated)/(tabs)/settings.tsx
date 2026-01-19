import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import AuthenticationButton from '@/components/buttons/authenticationButton';
import NumericalInput from '@/components/userInput/numericalInput';
import { getTabBarPadding } from '@/utils/tabBarHelpers';

export default function SettingsScreen() {
  const { userId, db, auth } = useAuth();
  const { theme, colors, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [defaultItemCount, setDefaultItemCount] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const preferences = userData.preferences || {};
        const count = preferences.defaultQuestionCount || 10;
        setDefaultItemCount(count.toString());
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!userId || !db) return;

    const count = parseInt(defaultItemCount, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Error', 'Please enter a valid number (1 or greater)');
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'preferences.defaultQuestionCount': count,
      });
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              if (auth) {
                await signOut(auth);
                // AuthContext will handle navigation via onAuthStateChanged
              }
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.contentContainer, { paddingBottom: getTabBarPadding(insets.bottom) }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.brandPrimary }}
              thumbColor={theme === 'dark' ? colors.textPrimary : colors.backgroundLighter}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferences</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <NumericalInput
            title="Default Number of Items"
            value={defaultItemCount}
            onChangeText={setDefaultItemCount}
            placeholder="10"
            keyboardType="numeric"
          />
          <AuthenticationButton
            title={saving ? 'Saving...' : 'Save Preferences'}
            onPress={handleSavePreferences}
            disabled={saving || loggingOut}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <AuthenticationButton
            title={loggingOut ? 'Logging out...' : 'Logout'}
            onPress={handleLogout}
            disabled={saving || loggingOut}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 30,
  },
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },
  section: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    marginBottom: 20,
  },
  sectionContent: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});