/**
 * Google OAuth scope configuration and validation utilities
 */

export const GOOGLE_PHOTOS_SCOPES = {
  PICKER_READONLY: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
} as const;

export const REQUIRED_SCOPES = [
  GOOGLE_PHOTOS_SCOPES.PICKER_READONLY,
] as const;

export type GoogleScope = typeof GOOGLE_PHOTOS_SCOPES[keyof typeof GOOGLE_PHOTOS_SCOPES];

/**
 * Validates that all required scopes are present in the granted scopes
 */
export function validateRequiredScopes(grantedScopes: string[]): {
  isValid: boolean;
  missingScopes: string[];
  hasAllScopes: boolean;
} {
  const missingScopes = REQUIRED_SCOPES.filter(
    requiredScope => !grantedScopes.includes(requiredScope)
  );

  return {
    isValid: missingScopes.length === 0,
    missingScopes,
    hasAllScopes: missingScopes.length === 0,
  };
}

/**
 * Formats a scope error message for users
 */
export function formatScopeErrorMessage(missingScopes: string[]): string {
  const scopeNames = missingScopes.map(scope => {
    if (scope.includes('photospicker')) return 'Google Photos Picker access';
    return scope;
  });

  return `Google Photos access is missing: ${scopeNames.join(', ')}. ` +
    'Please re-authorize so you can select photos through the Google Photos Picker.';
}

/**
 * Gets the scope string for OAuth authorization URL
 */
export function getScopeString(): string {
  return REQUIRED_SCOPES.join(' ');
}

/**
 * Checks if a specific scope is granted
 */
export function hasScope(grantedScopes: string[], scope: GoogleScope): boolean {
  return grantedScopes.includes(scope);
}

/**
 * Gets troubleshooting steps for scope issues
 */
export function getScopeTroubleshootingSteps(): string[] {
  return [
    '1. IMPORTANT: Re-authorize with Google Photos Picker access. The old Google Photos Library read scopes are no longer sufficient for browsing the full library.',
    '2. Go to Google Cloud Console (https://console.cloud.google.com/)',
    '3. Ensure "Google Photos Picker API" is ENABLED in the Library section',
    '4. Navigate to "APIs & Services" → "OAuth consent screen"',
    '5. Click "Edit App" and in the "Scopes" step, manually ADD this one:',
    '   - .../auth/photospicker.mediaitems.readonly',
    '6. In the "Test users" section, ensure your current email is added',
    '7. If you still have issues, try clearing your browser cache and re-authorizing.',
  ];
}

/**
 * Parses scopes from a space-separated string
 */
export function parseScopes(scopeString: string): string[] {
  return scopeString.split(' ').filter(scope => scope.length > 0);
}

/**
 * Formats scopes for display
 */
export function formatScopesForDisplay(scopes: string[]): string {
  return scopes.map(scope => {
    if (scope.includes('photospicker')) return 'Google Photos Picker access';
    return scope;
  }).join(', ');
}
