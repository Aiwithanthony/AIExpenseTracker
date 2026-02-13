import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState, useEffect, useRef } from 'react';
import { api } from './api';

// Complete the auth session when the browser redirects back
WebBrowser.maybeCompleteAuthSession();

// Google Web Client ID (from Google Cloud Console)
const GOOGLE_WEB_CLIENT_ID = '864410572466-45r453oovmj57eic32kbvkmdaoprj0ns.apps.googleusercontent.com';

/**
 * Google Sign-In using manual AuthRequest with explicit id_token response type
 * This ensures we use the implicit flow (id_token) instead of authorization code flow
 */
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState<AuthSession.AuthRequest | null>(null);
  const responsePromiseRef = useRef<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  } | null>(null);
  
  // Hardcode the Expo auth proxy URI
  // Format: https://auth.expo.io/@OWNER/SLUG
  const redirectUri = 'https://auth.expo.io/@anthonymoussallem/expense-tracker';
  
  // Initialize the AuthRequest with explicit id_token response type
  useEffect(() => {
    const authRequest = new AuthSession.AuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken, // Force implicit flow
      redirectUri: redirectUri,
      usePKCE: false, // PKCE not needed for implicit flow
      extraParams: {
        // Generate a random nonce (required for id_token)
        nonce: Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15),
      },
    });
    
    setRequest(authRequest);
    console.log('🔗 Using redirect URI:', redirectUri);
    console.log('📋 Make sure this URI is added to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs');
  }, []);

  // Note: We handle the response directly in promptAsync, not via useEffect

  const handleGoogleSignInSuccess = async (idToken: string) => {
    console.log('✅ Got ID token, sending to backend...');
    const backendResponse = await api.googleLogin(idToken);
    console.log('✅ Backend response received');
    return backendResponse;
  };

  const signIn = async () => {
    if (!request) {
      throw new Error('Google auth request not ready');
    }
    
    setIsLoading(true);
    
    console.log('🔵 Starting Google OAuth flow...');
    console.log('🔵 Client ID:', GOOGLE_WEB_CLIENT_ID);
    console.log('🔵 Redirect URI:', redirectUri);
    console.log('🔵 Response Type: id_token (implicit flow)');
    
    try {
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });
      
      console.log('📱 Google auth result:', JSON.stringify(result, null, 2));
      console.log('📱 Result type:', result.type);
      
      if (result.type === 'success' && 'params' in result) {
        const params = result.params as any;
        console.log('📱 Result params:', JSON.stringify(params, null, 2));
        
        if (params.id_token) {
          console.log('✅ ID token received!');
          const backendResponse = await handleGoogleSignInSuccess(params.id_token);
          setIsLoading(false);
          return backendResponse;
        } else if (params.error) {
          console.error('❌ OAuth error in params:', params.error);
          console.error('❌ Error description:', params.error_description);
          setIsLoading(false);
          throw new Error(params.error_description || params.error || 'Google OAuth error');
        } else {
          console.error('❌ Success but no id_token in params');
          setIsLoading(false);
          throw new Error('No ID token received from Google');
        }
      } else if (result.type === 'error') {
        const error = result.error as any;
        console.error('❌ Google OAuth error:', error);
        console.error('❌ Error code:', error?.code);
        console.error('❌ Error message:', error?.message);
        setIsLoading(false);
        throw new Error(error?.message || 'Google OAuth error');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.warn('⚠️ OAuth flow cancelled/dismissed by user');
        // Check if there are any error params in the cancel response
        if ('params' in result) {
          const params = result.params as any;
          console.log('📱 Cancel params:', JSON.stringify(params, null, 2));
          if (params.error) {
            console.error('❌ Error in cancel response:', params.error);
            console.error('❌ Error description:', params.error_description);
            console.error('❌ Error URI:', params.error_uri);
            setIsLoading(false);
            throw new Error(params.error_description || params.error || 'Google sign-in failed');
          }
        }
        setIsLoading(false);
        throw new Error('Google sign-in cancelled');
      } else {
        console.error('❌ Unexpected result type:', result.type);
        setIsLoading(false);
        throw new Error(`Unexpected OAuth result: ${result.type}`);
      }
    } catch (error: any) {
      console.error('❌ Sign-in error:', error);
      console.error('❌ Error stack:', error.stack);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    signIn,
    isLoading,
    isReady: request !== null,
  };
}

/**
 * Apple Sign-In (unchanged - already works well)
 */
export async function signInWithApple() {
  try {
    if (!AppleAuthentication.isAvailableAsync()) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Send credential to backend
    const response = await api.appleLogin({
      identityToken: credential.identityToken!,
      userIdentifier: credential.user,
      email: credential.email || undefined,
      fullName: credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined,
    });

    return response;
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      throw new Error('Apple sign-in cancelled');
    }
    throw new Error(error.message || 'Apple sign-in failed');
  }
}
