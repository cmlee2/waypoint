/**
 * Google OAuth scope configuration and validation utilities
 */

export const GOOGLE_PHOTOS_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/photoslibrary.readonly',
  FULL_ACCESS: 'https://www.googleapis.com/auth/photoslibrary',
} as const;

export const REQUIRED_SCOPES = [
  GOOGLE_PHOTOS_SCOPES.READONLY,
  GOOGLE_PHOTOS_SCOPES.FULL_ACCESS,
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
    '2. Navigate to APIs & Services → OAuth consent screen',
    '3. Add these scopes to your consent screen:',
    '   - https://www.googleapis.com/auth/photoslibrary.readonly',
    '   - https://www.googleapis.com/auth/photoslibrary',
    '4. Clear your browser cookies for accounts.google.com',
    '5. Try authorizing again',
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