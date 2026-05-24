import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IconName; focused: boolean; color: string | any }) {
  return <Ionicons name={name} size={22} color={color as string} />;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.inkMute,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="worklist"
        options={{
          title: 'Worklist',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="noticeboard"
        options={{
          title: 'Notices',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'megaphone' : 'megaphone-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checklists"
        options={{
          title: 'Checklists',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'checkbox' : 'checkbox-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sops"
        options={{
          title: 'SOPs',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.rule,
    borderTopWidth: 1,
    paddingTop: 4,
    height: 60,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
});
