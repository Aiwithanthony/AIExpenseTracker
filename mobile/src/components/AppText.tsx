import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  TextProps,
  TextInputProps,
} from 'react-native';

/**
 * Drop-in replacements for RN's Text and TextInput that render in Nunito.
 *
 * Why a wrapper instead of a global monkeypatch: on React Native 0.81 the core
 * Text/TextInput use the new `component()` type (plain function components with
 * no patchable `.render`), so the classic `Text.render` override is a no-op.
 * A wrapper component works on every RN version and architecture.
 *
 * Each element's `fontWeight` is mapped to the matching loaded Nunito cut,
 * because expo-font registers each weight as its own family. We then neutralize
 * `fontWeight` so iOS doesn't synthesize a faux-bold on top of the real cut.
 * An explicit `fontFamily` on the caller's style opts that element out.
 */
const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'Nunito_300Light',
  '200': 'Nunito_300Light',
  '300': 'Nunito_300Light',
  '400': 'Nunito_400Regular',
  normal: 'Nunito_400Regular',
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_800ExtraBold',
};

function nunitoStyle(style: any): any {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) {
    return style; // caller set a deliberate font — leave it alone
  }
  const weight = String(flat.fontWeight ?? '400');
  const fontFamily = WEIGHT_TO_FAMILY[weight] || 'Nunito_400Regular';
  return [style, { fontFamily, fontWeight: 'normal' as const }];
}

export function Text({ style, ...rest }: TextProps) {
  return <RNText style={nunitoStyle(style)} {...rest} />;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ style, ...rest }, ref) => (
    <RNTextInput ref={ref} style={nunitoStyle(style)} {...rest} />
  ),
);
TextInput.displayName = 'TextInput';
