/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Google Identity Services (GIS) Helper Module
 * Provides clean, secure, and modern Google Authentication for Misha Studio.
 * Uses official Google Identity Services (GIS) APIs:
 * - google.accounts.oauth2.initTokenClient (Modern OAuth2 Popup Flow)
 * - google.accounts.id.initialize & renderButton (Official Google Button & One-Tap)
 */

declare global {
  interface Window {
    google?: any;
    __GOOGLE_CLIENT_ID__?: string;
  }
}

export const DEFAULT_GOOGLE_CLIENT_ID =
  '519158285260-47pnfivd7bldlrkk00bglptgiiivbr8d.apps.googleusercontent.com';

/**
 * Retrieves and cleans the Google Client ID from environment variables,
 * falling back to the configured production client ID.
 * Strips leading protocols, trailing slashes, and surrounding whitespace.
 */
export const getGoogleClientId = (): string => {
  const rawId =
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    (window as any).__GOOGLE_CLIENT_ID__ ||
    DEFAULT_GOOGLE_CLIENT_ID;

  if (!rawId || typeof rawId !== 'string') {
    return DEFAULT_GOOGLE_CLIENT_ID;
  }

  const cleaned = rawId
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .trim();

  return cleaned || DEFAULT_GOOGLE_CLIENT_ID;
};

/**
 * Checks if a valid Google Client ID is configured.
 */
export const isGoogleAuthAvailable = (): boolean => {
  const clientId = getGoogleClientId();
  return Boolean(
    clientId &&
      clientId.length > 10 &&
      clientId.includes('.apps.googleusercontent.com')
  );
};

/**
 * Polls for window.google.accounts availability with timeout.
 */
export const waitForGoogleGIS = (timeoutMs = 4000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.google?.accounts) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve(Boolean(window.google?.accounts));
      }
    }, 100);
  });
};

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

/**
 * Initializes Google Identity Services for ID token / One-Tap / Button rendering.
 */
export const initGoogleIdServices = async (options: {
  onSuccess: (credential: string) => void;
  onError?: (err: any) => void;
}): Promise<boolean> => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return false;
  }

  const isLoaded = await waitForGoogleGIS();
  if (!isLoaded || !window.google?.accounts?.id) {
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response && response.credential) {
          options.onSuccess(response.credential);
        } else {
          options.onError?.(new Error('No credential returned from Google'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    return true;
  } catch (err) {
    console.warn('Google Identity Services initialization warning:', err);
    options.onError?.(err);
    return false;
  }
};

/**
 * Renders the official Google Sign-In button into a DOM container element.
 */
export const renderGoogleSignInButton = async (
  containerId: string,
  options?: {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    width?: string | number;
  }
): Promise<boolean> => {
  const clientId = getGoogleClientId();
  if (!clientId) return false;

  const isLoaded = await waitForGoogleGIS();
  if (!isLoaded || !window.google?.accounts?.id) return false;

  const element = document.getElementById(containerId);
  if (!element) return false;

  try {
    element.innerHTML = '';
    window.google.accounts.id.renderButton(element, {
      theme: options?.theme || 'filled_blue',
      size: options?.size || 'large',
      text: options?.text || 'continue_with',
      shape: options?.shape || 'pill',
      width: options?.width || '100%',
    });
    return true;
  } catch (e) {
    console.warn('Failed to render Google button:', e);
    return false;
  }
};

/**
 * Triggers the modern Google Identity Services OAuth 2.0 Token Client popup.
 * Retrieves verified user profile from Google's official userinfo endpoint.
 */
export const triggerGoogleOAuthFlow = async (params: {
  onSuccess: (userProfile: GoogleUserProfile) => void;
  onError: (errorMessage: string) => void;
}): Promise<void> => {
  const clientId = getGoogleClientId();

  if (!clientId) {
    params.onError(
      'Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.'
    );
    return;
  }

  const isLoaded = await waitForGoogleGIS();
  if (!isLoaded || !window.google?.accounts) {
    params.onError(
      'Google Identity Services client library is still loading. Please check your internet connection and try again.'
    );
    return;
  }

  try {
    // 1. Primary: Google Identity Services OAuth 2.0 Popup Token Client
    if (window.google?.accounts?.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            params.onError(
              tokenResponse.error_description ||
                tokenResponse.error ||
                'Google sign-in was cancelled or encountered an error.'
            );
            return;
          }

          if (!tokenResponse.access_token) {
            params.onError('No access token received from Google.');
            return;
          }

          try {
            // Fetch verified user profile directly from Google
            const profileRes = await fetch(
              'https://www.googleapis.com/oauth2/v3/userinfo',
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              }
            );

            if (!profileRes.ok) {
              params.onError('Failed to fetch verified user profile from Google.');
              return;
            }

            const profile = await profileRes.json();
            if (!profile || !profile.email) {
              params.onError('Google account does not have an email address associated.');
              return;
            }

            params.onSuccess({
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              picture: profile.picture,
            });
          } catch (fetchErr: any) {
            params.onError(
              fetchErr?.message || 'Failed to communicate with Google userinfo service.'
            );
          }
        },
        error_callback: (error: any) => {
          params.onError(error?.message || 'Google popup was blocked or failed to open.');
        },
      });

      tokenClient.requestAccessToken();
      return;
    }

    // 2. Fallback: Google One-Tap / ID Token prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          params.onError('Google One-Tap is not displayed. Please use Email login or check popup settings.');
        } else if (notification.isSkippedMoment()) {
          params.onError('Google sign-in prompt was closed.');
        }
      });
      return;
    }

    params.onError('Google Identity Services is unavailable in this browser environment.');
  } catch (err: any) {
    params.onError(err?.message || 'An unexpected error occurred during Google sign-in.');
  }
};
