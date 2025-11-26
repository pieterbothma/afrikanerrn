import { ReactNode } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type CardVariant = 'default' | 'hero' | 'featured' | 'subtle' | 'accent';

type BrutalistCardProps = {
  title: string;
  description: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
  /** Visual variant for hierarchy */
  variant?: CardVariant;
  /** Icon to display above title */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon color (defaults to charcoal) */
  iconColor?: string;
  /** Custom icon background color */
  iconBgColor?: string;
  /** Whether title should be left-aligned */
  alignLeft?: boolean;
  /** Custom container style */
  style?: ViewStyle;
};

// Default to Charcoal for icons in neobrutalism unless specified
const DEFAULT_ICON_COLOR = '#1A1A1A';

export default function BrutalistCard({
  title,
  description,
  leading,
  trailing,
  children,
  variant = 'default',
  icon,
  iconColor = DEFAULT_ICON_COLOR,
  iconBgColor,
  alignLeft = true, // Default to left aligned per guide
  style,
}: BrutalistCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'hero':
        return {
          container: 'rounded-xl p-6 border-3 border-borderBlack bg-yellow shadow-brutal',
          title: 'text-3xl font-black text-charcoal',
          description: 'text-lg text-charcoal font-medium',
        };
      case 'featured':
        return {
          container: 'rounded-xl p-5 border-3 border-borderBlack bg-ivory shadow-brutal',
          title: 'text-xl font-bold text-charcoal',
          description: 'text-base text-charcoal',
        };
      case 'accent':
        return {
          container: 'rounded-xl p-5 border-3 border-borderBlack bg-teal shadow-brutal',
          title: 'text-xl font-bold text-charcoal',
          description: 'text-base text-charcoal',
        };
      case 'subtle':
        return {
          container: 'rounded-lg p-4 border-2 border-borderBlack bg-sand',
          title: 'text-lg font-bold text-charcoal',
          description: 'text-sm text-charcoal',
        };
      default:
        return {
          container: 'rounded-xl p-5 border-3 border-borderBlack bg-ivory shadow-brutal',
          title: 'text-xl font-bold text-charcoal',
          description: 'text-base text-charcoal',
        };
    }
  };

  const styles = getVariantStyles();
  const textAlign = alignLeft ? 'text-left' : 'text-center';
  const itemsAlign = alignLeft ? 'items-start' : 'items-center';

  return (
    <View className={styles.container} style={style}>
      <View className={itemsAlign}>
        {leading ? <View className="mb-3">{leading}</View> : null}
        
        {icon && (
          <View
            className="mb-4 w-12 h-12 rounded-lg border-2 border-borderBlack items-center justify-center bg-white"
            style={iconBgColor ? { backgroundColor: iconBgColor } : undefined}
          >
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
        )}
        
        <Text className={`font-heading ${styles.title} ${textAlign}`}>
          {title}
        </Text>
        
        <Text className={`mt-2 ${styles.description} ${textAlign}`}>
          {description}
        </Text>
        
        {children ? <View className="mt-4 w-full">{children}</View> : null}
        {trailing ? <View className="mt-4 w-full">{trailing}</View> : null}
      </View>
    </View>
  );
}

// Convenience exports for specific card types
export function HeroCard(props: Omit<BrutalistCardProps, 'variant'>) {
  return <BrutalistCard {...props} variant="hero" />;
}

export function FeaturedCard(props: Omit<BrutalistCardProps, 'variant'>) {
  return <BrutalistCard {...props} variant="featured" />;
}

export function AccentCard(props: Omit<BrutalistCardProps, 'variant'>) {
  return <BrutalistCard {...props} variant="accent" />;
}

export function SubtleCard(props: Omit<BrutalistCardProps, 'variant'>) {
  return <BrutalistCard {...props} variant="subtle" />;
}
