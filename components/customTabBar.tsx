import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {TAB_BAR_HEIGHT} from '@/utils/tabBarHelpers';
import { useTheme } from '@/contexts/ThemeContext';

export default function CustomTabBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    // Check if we're in the (tabs) group
    const isInTabsGroup = segments[0] === '(authenticated)' && segments[1] === '(tabs)';
    
    if (!isInTabsGroup) {
      return false;
    }

    if (route === 'home') {
      // Home is active when on index or no specific tab screen
      return segments.length === 2;
    }
    
    // Check if the route matches the current segment
    return segments[2] === route;
  };

  const navigateTo = (route: string) => {
    if (segments[2] !== route) {
      router.push(`/(authenticated)/(tabs)/${route}` as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundTertiary, borderTopColor: colors.backgroundLighter, paddingBottom: insets.bottom }]}>
      <Pressable
        style={styles.tab}
        onPress={() => navigateTo('')}
      >
        <Ionicons
          name={isActive('home') ? 'home-sharp' : 'home-outline'}
          color={isActive('home') ? colors.brandPrimary : colors.textSecondary}
          size={24}
        />
        <Text
          style={[
            styles.label,
            { color: isActive('home') ? colors.brandPrimary : colors.textSecondary },
          ]}
        >
          Home
        </Text>
      </Pressable>

      <Pressable
        style={styles.tab}
        onPress={() => navigateTo('history')}
      >
        <MaterialIcons
          name="history"
          color={isActive('history') ? colors.brandPrimary : colors.textSecondary}
          size={24}
        />
        <Text
          style={[
            styles.label,
            { color: isActive('history') ? colors.brandPrimary : colors.textSecondary },
          ]}
        >
          History
        </Text>
      </Pressable>

      <Pressable
        style={styles.tab}
        onPress={() => navigateTo('settings')}
      >
        <Ionicons
          name={isActive('settings') ? 'settings-sharp' : 'settings-outline'}
          color={isActive('settings') ? colors.brandPrimary : colors.textSecondary}
          size={24}
        />
        <Text
          style={[
            styles.label,
            { color: isActive('settings') ? colors.brandPrimary : colors.textSecondary },
          ]}
        >
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopWidth: 1,
    height: TAB_BAR_HEIGHT,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 4,
    paddingBottom: 0,
    marginBottom: 0,
  },
});

