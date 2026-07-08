import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { api } from './api';

// Completes the auth session when the browser redirects back to the app.
WebBrowser.maybeCompleteAuthSession();

// OAuth client IDs from Google Cloud Console.
// - Web client is used by Expo Go and as the audience the backend verifies.
// - iOS/Android clients are used by standalone / development builds and use the
//   native reverse-DNS redirect (no defunct auth.expo.io proxy).
// Fill the native IDs in mobile/.env once the iOS/Android OAuth clients exist.
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '864410572466-45r453oovmj57eic32kbvkmdaoprj0ns.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

/**
 * Google Sign-In via expo-auth-session's Google provider.
 *
 * Uses `useIdTokenAuthRequest`, which performs the OIDC id_token flow with a
 * cryptographically-random nonce managed by the library, and derives the
 * redirect URI from the app config for the current platform. The resulting
 * id_token is sent to the backend (POST /auth/google), which verifies it.
 */
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  const signIn = async () => {
    if (!request) {
      throw new Error('Google auth request not ready');
    }

    setIsLoading(true);
    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const idToken =
          (result.params as Record<string, string> | undefined)?.id_token ||
          result.authentication?.idToken;
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }
        return await api.googleLogin(idToken);
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Google sign-in cancelled');
      }

      const message =
        result.type === 'error'
          ? result.error?.message || 'Google sign-in failed'
          : 'Google sign-in failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    isLoading,
    isReady: request !== null,
  };
}

/**
 * Apple Sign-In — sends the identity token to the backend for verification.
 */
export async function signInWithApple() {
  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    return await api.appleLogin({
      identityToken: credential.identityToken!,
      userIdentifier: credential.user,
      email: credential.email || undefined,
      fullName: credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined,
    });
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      throw new Error('Apple sign-in cancelled');
    }
    throw new Error(error.message || 'Apple sign-in failed');
  }
}
