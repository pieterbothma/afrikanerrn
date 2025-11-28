# Chat Experience Gaps

This document summarizes the key differences between Koedoe se chat-ervaring en Vercel se v0 iOS app soos beskryf in `.expo/vercelv0.md`.

## Layout & Header
- **Koedoe:** Large hero-style header with centered logo and action buttons sitting ~15% down from the status bar.
- **v0:** Header hugs the status bar and reuses compact controls, leaving more space for content.
- **Gap:** Valuable vertical real estate is lost before the first message appears.

## Message List Mechanics
- **Koedoe:** Standard `FlatList` with static `contentInset`. Keyboard/composer changes cause visible jumps.
- **v0:** LegendList + blank-size calculation keeps the newest message pinned to the top while the composer floats.
- **Gap:** No shared `blankSize` state nor dynamic inset recalculation, so scrolling feels jittery and inconsistent.

## Keyboard & Composer
- **Koedoe:** `KeyboardAvoidingView` + inline composer; multi-line input expands downward and can overlap messages.
- **v0:** `react-native-keyboard-controller` + `KeyboardStickyView` keep a floating Liquid Glass composer that adjusts blank size and autoscrolls only when necessary.
- **Gap:** Missing sticky composer, keyboard height tracking, and conditional autoscroll logic.

## Animations
- **Koedoe:** Messages simply appear; streaming text updates instantly.
- **v0:** First message animates to the top, assistant reply fades in after completion, and streaming content uses staggered fade pools.
- **Gap:** No `useFirstMessageAnimation`, `FadeInStaggered`, or shared animation values to make conversations feel alive.

## Input Enhancements
- **Koedoe:** Stock `TextInput` with default bounce/indicators and no paste interception.
- **v0:** Custom wrapper disables indicators, allows swipe-to-focus, and handles paste events to auto-create attachments.
- **Gap:** Advanced behaviors like pan-to-focus and paste attachments are unavailable.

These differences drive the implementation tasks in the Smooth Chat Upgrade plan.

