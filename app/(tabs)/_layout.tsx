import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#B46E3A';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: '#F7F3EE',
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 1,
          borderTopColor: '#2C2C2C',
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
