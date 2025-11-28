import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';

type TextInputWrapperProps = TextInputProps &
  ViewProps & {
    onPaste?: (text: string) => void;
  };

const PASTE_THRESHOLD = 18;
const PASTE_WINDOW_MS = 250;

export const TextInputWrapper = forwardRef<TextInput, TextInputWrapperProps>(
  ({ onPaste, style, onChangeText, ...rest }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const isFocusedRef = useRef(false);
    const [previousValue, setPreviousValue] = useState(
      typeof rest.value === 'string' ? rest.value : '',
    );
    const lastChangeTime = useRef(Date.now());

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => inputRef.current?.clear(),
      isFocused: () => inputRef.current?.isFocused() ?? false,
      setNativeProps: (props: Record<string, unknown>) =>
        inputRef.current?.setNativeProps(props),
    }));

    const handleTextChange = (text: string) => {
      const previous = previousValue ?? '';
      const delta = text.length - previous.length;
      const now = Date.now();
      if (
        onPaste &&
        delta >= PASTE_THRESHOLD &&
        now - lastChangeTime.current <= PASTE_WINDOW_MS
      ) {
        onPaste(text.slice(previous.length, previous.length + delta));
      }
      lastChangeTime.current = now;
      setPreviousValue(text);
      onChangeText?.(text);
    };

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dy) > 12 && Math.abs(gesture.dx) < 10,
          onPanResponderRelease: (_, gesture) => {
            if (gesture.dy < -24 && !isFocusedRef.current) {
              inputRef.current?.focus();
            }
          },
        }),
      [],
    );

    return (
      <View {...panResponder.panHandlers} style={style}>
        <TextInput
          ref={inputRef}
          scrollEnabled={false}
          onFocus={(event) => {
            isFocusedRef.current = true;
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            isFocusedRef.current = false;
            rest.onBlur?.(event);
          }}
          onChangeText={handleTextChange}
          {...rest}
        />
      </View>
    );
  },
);

TextInputWrapper.displayName = 'TextInputWrapper';

