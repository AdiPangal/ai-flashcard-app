/**
 * Tab bar constants and utilities
 */
export const TAB_BAR_HEIGHT = 80;

/**
 * Get the bottom padding needed to account for the tab bar
 * Use this in ScrollView contentContainerStyle paddingBottom
 */
export function getTabBarPadding(safeAreaBottom: number): number {
  return TAB_BAR_HEIGHT + safeAreaBottom;
}

