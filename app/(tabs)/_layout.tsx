import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#DE7356';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: '#8E8EA0',
        tabBarLabelStyle: {
          fontFamily: 'Geist',
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarItemStyle: {
          marginVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gesels',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color ?? ACCENT} />
          ),
        }}
      />
      <Tabs.Screen
        name="geskiedenis"
        options={{
          title: 'Kategoriee',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color ?? ACCENT} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Instellings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color ?? ACCENT} />,
        }}
      />
    </Tabs>
  );
}

