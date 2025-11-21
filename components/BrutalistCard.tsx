import { ReactNode } from 'react';
import { Text, View } from 'react-native';

type BrutalistCardProps = {
  title: string;
  description: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
};

export default function BrutalistCard({ title, description, leading, trailing, children }: BrutalistCardProps) {
  return (
    <View className="rounded-xl bg-card p-5 border border-border">
      {leading ? <View className="mb-3">{leading}</View> : null}
      <Text className="font-heading font-semibold text-xl text-foreground text-center">{title}</Text>
      <Text className="mt-2 font-normal text-base text-muted text-center">{description}</Text>
      {children ? <View className="mt-4">{children}</View> : null}
      {trailing ? <View className="mt-4">{trailing}</View> : null}
    </View>
  );
}
