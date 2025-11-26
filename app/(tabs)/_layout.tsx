import { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// Neobrutalist Theme Colors
const ACCENT = "#DE7356"; // Copper
const INACTIVE = "#1A1A1A"; // Charcoal
const BACKGROUND = "#E8E2D6"; // Sand
const BORDER = "#000000"; // Black
const ACTIVE_BG = "#FFD800"; // Yellow

// Animated tab icon with scale
function AnimatedTabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }
  }, [focused, scaleAnim]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={name} size={24} color={color} />
      </Animated.View>
    </View>
  );
}

// Custom tab bar component
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        
        // Skip hidden tabs
        if (options.href === null || route.name === 'subscription') {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Get icon name based on route
        const getIconName = (): keyof typeof Ionicons.glyphMap => {
          switch (route.name) {
            case "index":
              return isFocused ? "home" : "home-outline";
            case "chat":
              return isFocused ? "chatbubbles" : "chatbubbles-outline";
            case "fotos":
              return isFocused ? "images" : "images-outline";
            case "dokumente":
              return isFocused ? "document-text" : "document-text-outline";
            case "settings":
              return isFocused ? "settings-sharp" : "settings-outline";
            default:
              return "ellipse";
          }
        };

        const color = INACTIVE; // Always charcoal, focused state is handled by background

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabItem, 
              isFocused && styles.tabItemFocused
            ]}
            activeOpacity={0.7}
          >
            <AnimatedTabIcon
              name={getIconName()}
              focused={isFocused}
              color={color}
            />
            <Text
              style={[
                styles.label,
                { color, fontWeight: isFocused ? "700" : "500" },
              ]}
            >
              {typeof label === 'string' ? label : route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: BACKGROUND,
    borderTopWidth: 3,
    borderTopColor: BORDER,
    paddingTop: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tabItemFocused: {
    backgroundColor: ACTIVE_BG,
    borderColor: BORDER,
    // Brutalist shadow for focused tab
    borderBottomWidth: 4,
    borderRightWidth: 2, // slightly less for tab
  },
  iconContainer: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter",
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tuis",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Gesels",
        }}
      />
      <Tabs.Screen
        name="fotos"
        options={{
          title: "Fotos",
        }}
      />
      <Tabs.Screen
        name="dokumente"
        options={{
          title: "Dokumente",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Instellings",
        }}
      />

      {/* Hidden tabs */}
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}
