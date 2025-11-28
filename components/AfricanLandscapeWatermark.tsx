// AfricanLandscapeWatermark.tsx
// Simple African landscape watermark: acacia tree + sun + horizon
// Designed to sit behind content in the chat screen.

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type AfricanLandscapeWatermarkProps = {
  /** Overall visual size of the watermark */
  size?: number;
  /** Overall opacity of the watermark (very low by default) */
  opacity?: number;
};

export const AfricanLandscapeWatermark: React.FC<
  AfricanLandscapeWatermarkProps
> = ({ size = 220, opacity = 0.06 }) => {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg
        width={size}
        height={(size * 120) / 220}
        viewBox="0 0 220 120"
        style={{ opacity }}
      >
        {/* Sun */}
        <Circle cx={160} cy={32} r={18} fill="#FBBF24" />

        {/* Horizon line */}
        <Path
          d="M10 80 H210"
          stroke="#6B7280"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Small mound / hill under tree */}
        <Path
          d="M55 80 C70 74, 90 74, 105 80"
          stroke="#6B7280"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Tree trunk */}
        <Rect x={76} y={52} width={6} height={26} rx={3} fill="#4B5563" />

        {/* Acacia canopy */}
        <Path
          d="
            M52 48
            C60 40, 76 36, 92 38
            C106 39, 116 42, 122 46
            C114 48, 104 50, 92 50
            C78 50, 64 50, 52 48
          "
          fill="#4B5563"
        />

        {/* A few distant shrubs on the horizon */}
        <Path
          d="M132 78 C135 76, 138 76, 141 78"
          stroke="#6B7280"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M150 79 C152 77, 154 77, 156 79"
          stroke="#6B7280"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AfricanLandscapeWatermark;

