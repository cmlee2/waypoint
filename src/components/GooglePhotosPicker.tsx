'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Check, Image as ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';
import {
  GooglePhoto,
  GooglePhotosError,
  type GooglePhotosValidationResult,
  createGooglePhotosClient,
} from '@/utils/google/photos';
import {
  GOOGLE_PHOTOS_SCOPES,
  formatScopeErrorMessage,
  getScopeTroubleshootingSteps,
} from '@/utils/google/scopes';

type GooglePhotosClientType = ReturnType<typeof createGooglePhotosClient>['client'];
type GooglePhotosErrorKind = 'missing_scope' | 'api_denied' | 'token_invalid' | 'network_error' | 'unknown';

interface GooglePhotosPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosSelected: (photos: GooglePhoto[]) => void;
  onTokenExpired?: (forceRefresh?: boolean) => Promise<string | null>;
  accessToken: string;
  maxPhotos?: number;
}

export default function GooglePhotosPicker({
  isOpen,
  onClose,
  onPhotosSelected,
  onTokenExpired,
  accessToken,
  maxPhotos = 15,
}: GooglePhotosPickerProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<GooglePhotosErrorKind | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const hasAttemptedTokenRetryRef = useRef(false);

  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Use useMemo to ensure the client is always using the LATEST accessToken
  const { client, rateLimiter } = React.useMemo(() => 
    createGooglePhotosClient(accessToken), 
    [accessToken]
  );

  // Load photos when modal opens
  useEffect(() => {
    if (!isOpen || !accessToken) return;

    hasAttemptedTokenRetryRef.current = false;
    loadPhotos();
  }, [isOpen, accessToken]);

  const updateDebugInfo = async (token: string) => {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    const data = await response.json();
    setDebugInfo({
      grantedScopes: data.scope ? data.scope.split(' ') : [],
      expiresIn: data.expires_in,
      email: data.email,
    });
    return data;
  };

  const resetErrorState = () => {
    setError(null);
    setErrorKind(null);
    setShowTroubleshooting(false);
  };

  const setLoadError = (kind: GooglePhotosErrorKind, message: string) => {
    setError(message);
    setErrorKind(kind);
    setShowTroubleshooting(kind === 'missing_scope');
  };

  const normalizeValidationErrorKind = (
    reason: GooglePhotosValidationResult['reason']
  ): GooglePhotosErrorKind => {
    if (reason === 'missing_scope') return 'missing_scope';
    if (reason === 'token_invalid' || reason === 'expired') return 'token_invalid';
    return 'network_error';
  };

  const loadPhotos = async (
    pageToken?: string,
    options?: {
      accessTokenOverride?: string;
      clientOverride?: GooglePhotosClientType;
      allowRefreshRetry?: boolean;
    }
  ) => {
    const activeToken = options?.accessTokenOverride ?? accessToken;
    const activeClient = options?.clientOverride ?? client;
    const allowRefreshRetry = options?.allowRefreshRetry ?? true;

    if (pageToken) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      resetErrorState();
    }

    try {
      setIsLoading(true);
      resetErrorState();

      // 1. Get initial debug info
      await updateDebugInfo(activeToken);

      console.log('🔑 Validating Google Photos token...');
      const validation = await activeClient.validateToken();

      if (!validation.valid) {
        const shouldRetryRefresh =
          allowRefreshRetry &&
          onTokenExpired &&
          (validation.reason === 'token_invalid' || validation.reason === 'expired');

        if (shouldRetryRefresh) {
          console.log('🔄 Token invalid or expired, attempting forced refresh via callback...');
          const newToken = await onTokenExpired(true);
          if (newToken) {
            const { client: refreshedClient } = createGooglePhotosClient(newToken);
            const refreshedValidation = await refreshedClient.validateToken();

            if (refreshedValidation.valid) {
              await updateDebugInfo(newToken);
              return loadPhotos(pageToken, {
                accessTokenOverride: newToken,
                clientOverride: refreshedClient,
                allowRefreshRetry: false,
              });
            }

            const nextKind = normalizeValidationErrorKind(refreshedValidation.reason);
            const nextMessage =
              nextKind === 'missing_scope'
                ? formatScopeErrorMessage([GOOGLE_PHOTOS_SCOPES.READONLY])
                : 'Authentication failed. Please re-authorize Google Photos and try again.';

            setLoadError(nextKind, nextMessage);
            return;
          }
        }

        if (validation.reason === 'missing_scope') {
          setLoadError('missing_scope', formatScopeErrorMessage([GOOGLE_PHOTOS_SCOPES.READONLY]));
          return;
        }

        setLoadError(
          normalizeValidationErrorKind(validation.reason),
          'Authentication failed. Please re-authorize Google Photos and try again.'
        );
        return;
      }

      // 3. Make the actual API call using the ACTIVE client
      console.log('✅ Token valid, listing photos...');
      const result = await rateLimiter.execute(() =>
        activeClient.listPhotos(50, pageToken)
      );

      console.log(`📸 Loaded ${result.photos.length} photos`);
      if (pageToken) {
        setPhotos(prev => [...prev, ...result.photos]);
      } else {
        setPhotos(result.photos);
      }
      setNextPageToken(result.nextPageToken);

    } catch (err) {
      console.error('❌ Failed to load photos:', err);

      if (err instanceof GooglePhotosError && err.code === 'api_denied') {
        if (hasAttemptedTokenRetryRef.current) {
          setLoadError(
            'api_denied',
            err.message
          );
          return;
        }

        hasAttemptedTokenRetryRef.current = true;

        if (allowRefreshRetry && onTokenExpired) {
          console.log('🔄 API denied with valid scopes, attempting one forced token refresh...');
          const newToken = await onTokenExpired(true);
          if (newToken) {
            const { client: refreshedClient } = createGooglePhotosClient(newToken);
            const refreshedValidation = await refreshedClient.validateToken();

            if (refreshedValidation.valid) {
              await updateDebugInfo(newToken);
              await loadPhotos(pageToken, {
                accessTokenOverride: newToken,
                clientOverride: refreshedClient,
                allowRefreshRetry: false,
              });
              return;
            }
          }
        }

        setLoadError('api_denied', err.message);
        return;
      }

      if (err instanceof GooglePhotosError) {
        const kind: GooglePhotosErrorKind =
          err.code === 'api_denied'
            ? 'api_denied'
            : err.code === 'token_invalid'
              ? 'token_invalid'
              : 'network_error';
        setLoadError(kind, err.message);
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load photos';
      setLoadError('unknown', errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);

      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else if (newSet.size < maxPhotos) {
        newSet.add(photoId);
      }

      return newSet;
    });
  };

  const handleImport = () => {
    const selected = photos.filter(photo => selectedPhotos.has(photo.id));
    onPhotosSelected(selected);
    onClose();
  };

  if (!isOpen) return null;

  const canImport = selectedPhotos.size > 0 && selectedPhotos.size <= maxPhotos;
  const remainingSlots = maxPhotos - selectedPhotos.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Import from Google Photos</h2>
            <p className="text-sm text-stone-500 mt-1">
              Select up to {maxPhotos} photos ({selectedPhotos.size} selected)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-stone-100"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                {errorKind && (
                  <div className="mt-3">
                    {errorKind === 'missing_scope' && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = '/api/google/oauth?action=authorize&returnUrl=/trips/new';
                        }}
                        className="text-sm text-red-600 underline hover:text-red-800"
                      >
                        Re-authorize with Google Photos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                      className="text-sm text-red-600 underline hover:text-red-800 ml-4"
                    >
                      {showTroubleshooting ? 'Hide troubleshooting steps' : 'Show troubleshooting steps'}
                    </button>
                    {showTroubleshooting && (
                      <div className="mt-2 text-sm text-red-600 bg-red-100/50 rounded-lg p-3">
                        {errorKind === 'missing_scope' ? (
                          <ol className="list-decimal list-inside space-y-1">
                            {getScopeTroubleshootingSteps().map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        ) : (
                          <div className="space-y-2">
                            <p>
                              Google Photos denied the request even though the token appears to have scopes.
                              This usually means the Photos Library API is disabled, the OAuth consent screen is not fully configured,
                              or the consent grant is stale.
                            </p>
                            <p className="text-xs text-red-500">
                              The app will no longer label this as a missing-scope problem unless tokeninfo actually reports one.
                            </p>
                          </div>
                        )}
                        
                        {debugInfo && (
                          <div className="mt-4 pt-4 border-t border-red-200 text-xs font-mono">
                            <p className="font-bold uppercase mb-1">Current Token Debug Info:</p>
                            <p>Email: {debugInfo.email}</p>
                            <p>Expires In: {debugInfo.expiresIn}s</p>
                            <p className="mt-1">Granted Scopes:</p>
                            <ul className="list-disc list-inside pl-2">
                              {debugInfo.grantedScopes.map((s: string) => (
                                <li key={s} className="truncate">{s}</li>
                              ))}
                              {debugInfo.grantedScopes.length === 0 && <li>NONE (Did you check the box?)</li>}
                            </ul>
                            <p className="mt-3 text-red-500">
                              The error above is the real Google response.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500">Loading your photos...</p>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ImageIcon size={48} className="text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-500">No photos found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                const canSelect = !isSelected && selectedPhotos.size < maxPhotos;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => togglePhotoSelection(photo.id)}
                    disabled={!canSelect && !isSelected}
                    className={`
                      relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-stone-200'}
                      ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:border-stone-300'}
                    `}
                  >
                    <img
                      src={client.getPhotoDownloadUrl(photo, 300, 300)}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />

                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Filename */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{photo.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {nextPageToken && !isLoading && photos.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => loadPhotos(nextPageToken)}
                disabled={isLoadingMore}
                className="rounded-xl border border-stone-300 bg-white px-6 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More Photos'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 p-4">
          <div className="text-sm text-stone-500">
            {remainingSlots > 0 ? (
              <span>{remainingSlots} more photo{remainingSlots !== 1 ? 's' : ''} can be selected</span>
            ) : (
              <span className="text-red-600">Maximum {maxPhotos} photos selected</span>
            )}
          </div>
          <div className="flex gap-3">
            {errorKind && (
              <div className="flex gap-3">
                {errorKind === 'missing_scope' && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/api/google/oauth?action=authorize&returnUrl=/trips/new';
                    }}
                    className="rounded-xl border border-red-300 bg-red-50 px-6 py-2 font-medium text-red-700 transition-colors hover:bg-red-100 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Re-authorize
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/google/token', { method: 'DELETE' });
                    window.location.reload();
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-6 py-2 font-medium text-stone-600 transition-colors hover:bg-stone-100"
                >
                  Clear Session & Logout
                </button>
              </div>
            )}
            {error && errorKind !== 'missing_scope' && (
              <button
                type="button"
                onClick={() => loadPhotos(undefined, { allowRefreshRetry: true })}
                className="rounded-xl border border-stone-300 bg-white px-6 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Retry with Fresh Token
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-6 py-2 font-medium transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
