'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ExternalLink, Image as ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';
import {
  GooglePhoto,
  GooglePhotosError,
  type GooglePhotosPickedMediaItem,
  type GooglePhotosPickerSession,
  createGooglePhotosClient,
} from '@/utils/google/photos';
import {
  GOOGLE_PHOTOS_SCOPES,
  formatScopeErrorMessage,
  getScopeTroubleshootingSteps,
} from '@/utils/google/scopes';

type GooglePhotosErrorKind = 'missing_scope' | 'api_denied' | 'network_error' | 'picker_timeout' | 'unknown';

interface GooglePhotosPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosSelected: (photos: GooglePhoto[]) => void;
  onTokenExpired?: (forceRefresh?: boolean) => Promise<string | null>;
  accessToken: string;
  maxPhotos?: number;
}

function parseDurationSeconds(duration?: string): number {
  if (!duration) return 3;
  const parsed = Number.parseFloat(duration.replace('s', ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export default function GooglePhotosPicker({
  isOpen,
  onClose,
  onPhotosSelected,
  onTokenExpired,
  accessToken,
  maxPhotos = 15,
}: GooglePhotosPickerProps) {
  const [session, setSession] = useState<GooglePhotosPickerSession | null>(null);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<GooglePhotosErrorKind | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [sessionMessage, setSessionMessage] = useState<string>('Preparing Google Photos Picker...');
  const [hasLoadedItems, setHasLoadedItems] = useState(false);

  const client = useMemo(() => createGooglePhotosClient(accessToken).client, [accessToken]);
  const pollTimerRef = useRef<number | null>(null);
  const createRetryRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const resetState = () => {
    setSession(null);
    setPhotos([]);
    setSelectedPhotos(new Set());
    setError(null);
    setErrorKind(null);
    setShowTroubleshooting(false);
    setDebugInfo(null);
    setSessionMessage('Preparing Google Photos Picker...');
    setHasLoadedItems(false);
    setIsCreatingSession(false);
    setIsPolling(false);
    setIsOpeningPicker(false);
    sessionIdRef.current = null;
  };

  const clearPollTimer = () => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const updateDebugInfo = async (token: string) => {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    const data = await response.json();
    setDebugInfo({
      grantedScopes: data.scope ? data.scope.split(' ') : [],
      expiresIn: data.expires_in,
      email: data.email,
    });
  };

  const setLoadError = (kind: GooglePhotosErrorKind, message: string) => {
    setError(message);
    setErrorKind(kind);
    setShowTroubleshooting(kind === 'missing_scope' || kind === 'api_denied');
  };

  const convertPickedItems = (items: GooglePhotosPickedMediaItem[]) =>
    items.map(item => client.convertPickedMediaItemToGooglePhoto(item));

  const loadAllPickedMediaItems = async (sessionId: string) => {
    const collected: GooglePhoto[] = [];
    let pageToken: string | undefined;

    while (true) {
      const response = await fetch(
        `/api/google/picker/session/${encodeURIComponent(sessionId)}/media-items?${new URLSearchParams({
          pageSize: '100',
          ...(pageToken ? { pageToken } : {}),
        }).toString()}`
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to load picked media items');
      }

      const payload = await response.json();
      const pageItems = Array.isArray(payload.mediaItems) ? payload.mediaItems : [];
      collected.push(...convertPickedItems(pageItems));
      pageToken = payload.nextPageToken;

      if (!pageToken) break;
    }

    return collected;
  };

  const pollSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/google/picker/session/${encodeURIComponent(sessionId)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to poll picker session');
      }

      const payload = await response.json();
      const currentSession = payload as GooglePhotosPickerSession;
      setSession(currentSession);
      sessionIdRef.current = currentSession.id;

      if (currentSession.mediaItemsSet) {
        clearPollTimer();
        setIsPolling(false);
        const pickedPhotos = await loadAllPickedMediaItems(sessionId);
        setPhotos(pickedPhotos);
        setSelectedPhotos(new Set(pickedPhotos.map(photo => photo.id)));
        setHasLoadedItems(true);
        setSessionMessage(`Selected ${pickedPhotos.length} photo${pickedPhotos.length === 1 ? '' : 's'} from Google Photos.`);
        return;
      }

      const intervalMs = parseDurationSeconds(currentSession.pollingConfig?.pollInterval) * 1000;
      setSessionMessage(
        `Waiting for you to finish picking in Google Photos. Polling every ${parseDurationSeconds(currentSession.pollingConfig?.pollInterval)}s.`
      );
      pollTimerRef.current = window.setTimeout(() => {
        void pollSession(sessionId);
      }, intervalMs);
    } catch (err) {
      console.error('Failed to poll Google Photos session:', err);
      clearPollTimer();
      setIsPolling(false);
      setLoadError('picker_timeout', err instanceof Error ? err.message : 'Failed to poll Google Photos session');
    }
  };

  const createSession = async () => {
    if (isCreatingSession) return;
    setIsCreatingSession(true);
    setError(null);
    setErrorKind(null);
    setShowTroubleshooting(false);

    try {
      await updateDebugInfo(accessToken);

      const response = await fetch('/api/google/picker/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxItemCount: maxPhotos }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.details || payload?.error || 'Failed to create Google Photos Picker session';
        const status = response.status;
        if (status === 401 || message.toLowerCase().includes('scope')) {
          if (!createRetryRef.current && onTokenExpired) {
            createRetryRef.current = true;
            const refreshedToken = await onTokenExpired(true);
            if (refreshedToken) {
              setIsCreatingSession(false);
              await createSession();
              return;
            }
          }

          setLoadError(
            'missing_scope',
            formatScopeErrorMessage([GOOGLE_PHOTOS_SCOPES.PICKER_READONLY])
          );
          return;
        }

        if (status === 403) {
          setLoadError(
            'api_denied',
            'Google Photos Picker denied access. Enable the Picker API in Google Cloud Console and re-authorize with the new Google Photos Picker scope.'
          );
          return;
        }

        throw new Error(message);
      }

      const createdSession = (await response.json()) as GooglePhotosPickerSession;
      setSession(createdSession);
      sessionIdRef.current = createdSession.id;
      setSessionMessage('Open Google Photos in a new tab, then finish picking photos there.');
      setIsPolling(true);
      clearPollTimer();
      pollTimerRef.current = window.setTimeout(() => {
        void pollSession(createdSession.id);
      }, parseDurationSeconds(createdSession.pollingConfig?.pollInterval) * 1000);
    } catch (err) {
      console.error('Failed to create Google Photos Picker session:', err);
      if (err instanceof GooglePhotosError && err.code === 'api_denied') {
        setLoadError(
          'api_denied',
          'Google Photos Picker denied access. Enable the Picker API in Google Cloud Console and re-authorize.'
        );
      } else {
        setLoadError('network_error', err instanceof Error ? err.message : 'Failed to create Google Photos Picker session');
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  const openPicker = async () => {
    if (!session?.pickerUri) return;

    setIsOpeningPicker(true);
    window.open(`${session.pickerUri.replace(/\/$/, '')}/autoclose`, '_blank', 'noopener,noreferrer');
    setIsOpeningPicker(false);
  };

  useEffect(() => {
    if (!isOpen || !accessToken) return;

    // Only reset state if this is a fresh open (no session or error)
    if (!session && !error) {
      createRetryRef.current = false;
      resetState();
      void createSession();
    }

    return () => {
      clearPollTimer();
      if (sessionIdRef.current) {
        void fetch(`/api/google/picker/session/${encodeURIComponent(sessionIdRef.current)}`, {
          method: 'DELETE',
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => clearPollTimer();
  }, []);

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else if (next.size < maxPhotos) {
        next.add(photoId);
      }
      return next;
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
        <div className="flex items-center justify-between border-b border-stone-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Import from Google Photos</h2>
            <p className="mt-1 text-sm text-stone-500">
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

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">{error}</p>
                {errorKind && (
                  <div className="mt-3">
                    {(errorKind === 'missing_scope' || errorKind === 'api_denied') && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = '/api/google/oauth?action=authorize&returnUrl=/trips/new';
                        }}
                        className="text-sm text-red-600 underline hover:text-red-800"
                      >
                        Re-authorize with Google Photos Picker
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                      className="ml-4 text-sm text-red-600 underline hover:text-red-800"
                    >
                      {showTroubleshooting ? 'Hide troubleshooting steps' : 'Show troubleshooting steps'}
                    </button>
                    {showTroubleshooting && (
                      <div className="mt-2 rounded-lg bg-red-100/50 p-3 text-sm text-red-600">
                        <ol className="list-decimal list-inside space-y-1">
                          {getScopeTroubleshootingSteps().map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        {debugInfo && (
                          <div className="mt-4 border-t border-red-200 pt-4 font-mono text-xs">
                            <p className="mb-1 font-bold uppercase">Current Token Debug Info:</p>
                            <p>Email: {debugInfo.email}</p>
                            <p>Expires In: {debugInfo.expiresIn}s</p>
                            <p className="mt-1">Granted Scopes:</p>
                            <ul className="list-disc list-inside pl-2">
                              {debugInfo.grantedScopes.map((s: string) => (
                                <li key={s} className="truncate">{s}</li>
                              ))}
                              {debugInfo.grantedScopes.length === 0 && <li>NONE</li>}
                            </ul>
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

        <div className="flex-1 overflow-y-auto p-6">
          {!session && (isCreatingSession || isPolling) && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 size={32} className="mx-auto mb-2 animate-spin text-stone-400" />
                <p className="text-sm text-stone-500">{sessionMessage}</p>
              </div>
            </div>
          )}

          {session && !hasLoadedItems && (
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-start gap-3">
                <ImageIcon size={24} className="mt-0.5 text-stone-500" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-900">Open Google Photos Picker</p>
                  <p className="text-sm text-stone-600">{sessionMessage}</p>
                  {session.pickerUri && (
                    <button
                      type="button"
                      onClick={openPicker}
                      disabled={isOpeningPicker}
                      className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                    >
                      {isOpeningPicker ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                      Open Google Photos
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasLoadedItems && photos.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <ImageIcon size={48} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm text-stone-500">No photos were selected</p>
                <button
                  type="button"
                  onClick={createSession}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <RefreshCw size={16} />
                  Start a new picker session
                </button>
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map(photo => {
                const isSelected = selectedPhotos.has(photo.id);
                const canSelect = !isSelected && selectedPhotos.size < maxPhotos;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => togglePhotoSelection(photo.id)}
                    disabled={!canSelect && !isSelected}
                    className={`
                      relative aspect-square overflow-hidden rounded-xl border-2 transition-all
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-stone-200'}
                      ${!canSelect && !isSelected ? 'cursor-not-allowed opacity-50' : 'hover:border-stone-300'}
                    `}
                  >
                    <img
                      src={`/api/google/picker/media-file?${new URLSearchParams({
                        baseUrl: photo.baseUrl,
                        width: '300',
                        height: '300',
                      }).toString()}`}
                      alt={photo.filename}
                      className="h-full w-full object-cover"
                    />

                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="truncate text-xs text-white">{photo.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 p-4">
          <div className="text-sm text-stone-500">
            {remainingSlots > 0 ? (
              <span>{remainingSlots} more photo{remainingSlots !== 1 ? 's' : ''} can be selected</span>
            ) : (
              <span className="text-red-600">Maximum {maxPhotos} photos selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={createSession}
              disabled={isCreatingSession}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {isCreatingSession ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              New Session
            </button>
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
              className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
