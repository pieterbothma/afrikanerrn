import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#B46E3A';
const FOREGROUND = '#E8E2D6';

type HeaderVariant = 'default' | 'transparent' | 'elevated';

type HeaderProps = {
  /** Title text displayed in the center */
  title?: string;
  /** Show back button on the left */
  showBack?: boolean;
  /** Custom back button handler (defaults to router.back()) */
  onBack?: () => void;
  /** Show menu icon on the left (mutually exclusive with showBack) */
  showMenu?: boolean;
  /** Menu icon press handler */
  onMenuPress?: () => void;
  /** Logo image to display in center (overrides title) */
  logo?: ImageSourcePropType;
  /** Logo dimensions */
  logoStyle?: { height?: number; width?: number };
  /** Right side action button */
  rightAction?: ReactNode;
  /** Additional right action (for screens with multiple actions) */
  rightActionSecondary?: ReactNode;
  /** Header visual variant */
  variant?: HeaderVariant;
  /** Custom content to render in place of title */
  centerContent?: ReactNode;
  /** Whether header should have bottom border */
  showBorder?: boolean;
};

export default function Header({
  title,
  showBack = false,
  onBack,
  showMenu = false,
  onMenuPress,
  logo,
  logoStyle = { height: 56, width: 200 },
  rightAction,
  rightActionSecondary,
  variant = 'default',
  centerContent,
  showBorder = true,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const getBackgroundStyle = () => {
    switch (variant) {
      case 'transparent':
        return 'bg-transparent';
      case 'elevated':
        return 'bg-surface-elevated';
      default:
        return 'bg-background';
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${getBackgroundStyle()} ${
        showBorder ? 'border-b border-border' : ''
      }`}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      {/* Left Side */}
      <View className="w-12 items-start">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="p-2 -ml-2 active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Gaan terug"
          >
            <Ionicons name="arrow-back" size={24} color={FOREGROUND} />
          </TouchableOpacity>
        )}
        {showMenu && !showBack && (
          <TouchableOpacity
            onPress={onMenuPress}
            className="p-2 active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={24} color={FOREGROUND} />
          </TouchableOpacity>
        )}
        {!showBack && !showMenu && <View className="w-10" />}
      </View>

      {/* Center */}
      <View className="flex-1 items-center justify-center px-4">
        {centerContent ? (
          centerContent
        ) : logo ? (
          <Image
            source={logo}
            style={{
              height: logoStyle.height,
              width: logoStyle.width,
              resizeMode: 'contain',
            }}
          />
        ) : title ? (
          <Text
            className="font-heading font-semibold text-xl text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right Side */}
      <View className="flex-row items-center gap-1">
        {rightActionSecondary}
        {rightAction ? (
          rightAction
        ) : (
          <View className="w-10" />
        )}
      </View>
    </View>
  );
}

// Pre-configured header variants for common use cases
export function ChatHeader({
  onMenuPress,
  onNewChat,
}: {
  onMenuPress: () => void;
  onNewChat: () => void;
}) {
  return (
    <Header
      showMenu
      onMenuPress={onMenuPress}
      logo={require('../assets/branding/koedoelogo.png')}
      rightAction={
        <TouchableOpacity
          onPress={onNewChat}
          className="w-10 h-10 rounded-xl bg-teal border-2 border-borderBlack items-center justify-center active:opacity-70 shadow-brutal-sm"
          accessibilityRole="button"
          accessibilityLabel="Nuwe gesprek"
        >
          <Ionicons name="create" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      }
    />
  );
}

export function ScreenHeader({
  title,
  showMenu = false,
  onMenuPress,
  rightAction,
}: {
  title: string;
  showMenu?: boolean;
  onMenuPress?: () => void;
  rightAction?: ReactNode;
}) {
  return (
    <Header
      title={title}
      showMenu={showMenu}
      onMenuPress={onMenuPress}
      rightAction={rightAction}
    />
  );
}

export function BackHeader({
  title,
  rightAction,
}: {
  title: string;
  rightAction?: ReactNode;
}) {
  return (
    <Header
      title={title}
      showBack
      rightAction={rightAction}
    />
  );
}

