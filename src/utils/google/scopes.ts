/**
 * Google OAuth scope configuration and validation utilities
 */

export const GOOGLE_PHOTOS_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/photoslibrary.readonly',
  FULL_ACCESS: 'https://www.googleapis.com/auth/photoslibrary',
} as const;

export const REQUIRED_SCOPES = [
  GOOGLE_PHOTOS_SCOPES.READONLY,
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
    if (scope.includes('readonly')) return 'Read-only access to photos';
    if (scope.includes('photoslibrary')) return 'Full access to photos';
    return scope;
  });

  return `Insufficient permissions. Missing: ${scopeNames.join(', ')}. ` +
    'Please re-authorize with all required permissions.';
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
    '1. Go to Google Cloud Console (https://console.cloud.google.com/)',
    '2. Ensure "Photos Library API" is ENABLED in the Library section',
    '3. Navigate to "APIs & Services" → "OAuth consent screen"',
    '4. Click "Edit App" and in the "Scopes" step, manually ADD this one:',
    '   - .../auth/photoslibrary.readonly',
    '5. IMPORTANT: In the "Test users" section, ensure your current email is added',
    '6. If the project is in "Testing" mode, ONLY whitelisted test users can log in',
    '7. Clear browser cookies for accounts.google.com and try again',
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
    if (scope.includes('readonly')) return 'Read-only access';
    if (scope.includes('photoslibrary')) return 'Full access';
    return scope;
  }).join(', ');
}