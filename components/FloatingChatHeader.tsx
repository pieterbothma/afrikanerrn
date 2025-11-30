import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO = require('../assets/branding/koedoelogo.png');

interface FloatingChatHeaderProps {
  onMenuPress: () => void;
  onNewChat: () => void;
  title?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  showRightIcon?: boolean;
}

export default function FloatingChatHeader({ 
  onMenuPress, 
  onNewChat, 
  title = "Klets", 
  rightIcon = "create-outline",
  showRightIcon = true
}: FloatingChatHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 4,
        left: 16,
        right: 16,
        zIndex: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Menu Icon */}
      <View className="w-12 items-start">
        <TouchableOpacity
          onPress={onMenuPress}
          className="w-10 h-10 bg-white rounded-xl border-2 border-charcoal items-center justify-center active:translate-y-1 active:shadow-none"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
          }}
        >
          <Ionicons name="menu" size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Center: Koedoe Pill */}
      <View 
        className="flex-row items-center gap-2 bg-yellow/20 px-3 py-1 rounded-xl border-2 border-transparent"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <Image source={LOGO} style={{ height: 24, width: 24, resizeMode: 'contain' }} />
        <Text className="font-heading font-black text-lg text-charcoal">{title}</Text>
      </View>

      {/* Right: Compose Icon */}
      <View className="w-12 items-end">
        {showRightIcon ? (
          <TouchableOpacity
            onPress={onNewChat}
            className="w-10 h-10 bg-white rounded-xl border-2 border-charcoal items-center justify-center active:translate-y-1 active:shadow-none"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
            }}
          >
            <Ionicons name={rightIcon} size={22} color="#1A1A1A" />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10" />
        )}
      </View>
    </View>
  );
}
