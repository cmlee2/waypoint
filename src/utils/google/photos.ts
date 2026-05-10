import exifr from 'exifr';

export interface GooglePhoto {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  creationTime: string;
  mediaMetadata: {
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
      exposureTime?: string;
    };
  };
  locationInfo?: {
    latitude: number;
    longitude: number;
  };
}

export interface GooglePhotosListResponse {
  photos: GooglePhoto[];
  nextPageToken?: string;
}

export interface GooglePhotoDownloadResponse {
  url: string;
  filename: string;
  mimeType: string;
}

export interface GooglePhotosPickerSession {
  id: string;
  pickerUri: string;
  pollingConfig?: {
    pollInterval?: string;
    timeoutIn?: string;
  };
  expireTime?: string;
  pickingConfig?: {
    maxItemCount?: string;
  };
  mediaItemsSet?: boolean;
}

export interface GooglePhotosPickedMediaItem {
  id: string;
  createTime: string;
  type: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
    mediaFileMetadata?: {
      width?: number;
      height?: number;
      cameraMake?: string;
      cameraModel?: string;
      photoMetadata?: {
        focalLength?: number;
        apertureFNumber?: number;
        isoEquivalent?: number;
        exposureTime?: string;
      };
      videoMetadata?: {
        fps?: number;
        processingStatus?: 'UNSPECIFIED' | 'PROCESSING' | 'READY' | 'FAILED';
      };
    };
  };
}

export interface GooglePhotosPickerMediaItemsResponse {
  mediaItems: GooglePhotosPickedMediaItem[];
  nextPageToken?: string;
}

export type GooglePhotosErrorCode =
  | 'token_invalid'
  | 'missing_scope'
  | 'api_denied'
  | 'network_error';

export class GooglePhotosError extends Error {
  code: GooglePhotosErrorCode;
  status?: number;

  constructor(message: string, code: GooglePhotosErrorCode, status?: number) {
    super(message);
    this.name = 'GooglePhotosError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, GooglePhotosError.prototype);
  }
}

export interface GooglePhotosValidationResult {
  valid: boolean;
  reason?: 'token_invalid' | 'missing_scope' | 'expired' | 'unknown';
  grantedScopes?: string[];
  expiresIn?: number;
}

/**
 * Google Photos API client for accessing user's photos
 */
export class GooglePhotosClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Validates the access token by checking token info
   */
  async validateToken(): Promise<GooglePhotosValidationResult> {
    try {
      console.log('🔍 Validating token with Google OAuth2 API...');
      const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + this.accessToken);
      const data = await response.json();

      console.log('📋 Token validation result:', {
        valid: response.ok,
        hasScopes: !!data.scope,
        scopeCount: data.scope ? data.scope.split(' ').length : 0,
        expires_in: data.expires_in,
        issued_to: data.issued_to ? data.issued_to.substring(0, 10) + '...' : 'N/A'
      });

      if (!response.ok) {
        console.error('❌ Token validation failed (tokeninfo API):', data);
        if (data.error_description === 'Invalid Value' || data.error === 'invalid_token') {
          console.error('The token is invalid. This usually means it was revoked or malformed.');
          return { valid: false, reason: 'token_invalid' };
        }
        return { valid: false, reason: 'unknown' };
      }

      const tokenScopes = data.scope || '';
      console.log('🔑 Token scopes:', tokenScopes);
      
      // Check if the token is expired
      const expiresIn = parseInt(data.expires_in || '0', 10);
      if (expiresIn && expiresIn < 30) {
        console.error('❌ Token is expired or about to expire:', expiresIn, 'seconds');
        return { valid: false, reason: 'expired', expiresIn, grantedScopes: tokenScopes.split(' ').filter(Boolean) };
      }

      // Check that at least one relevant scope is present
      const hasPickerScope = tokenScopes.includes('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
      
      console.log('✅ Scope check result:', {
        hasPickerScope,
        expiresIn
      });

      if (!hasPickerScope) {
        console.error('❌ Token missing required Google Photos Picker scope');
        return { valid: false, reason: 'missing_scope', grantedScopes: tokenScopes.split(' ').filter(Boolean), expiresIn };
      }

      // Success! We have a valid token with correct scopes.
      console.log('✅ Token validation successful (scopes & expiration)');
      return {
        valid: true,
        grantedScopes: tokenScopes.split(' ').filter(Boolean),
        expiresIn,
      };
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return { valid: false, reason: 'unknown' };
    }
  }

  /**
   * Lists photos from the user's Google Photos library
   * @param pageSize Number of photos to return (max 100)
   * @param pageToken Token for pagination
   */
  async listPhotos(pageSize: number = 50, pageToken?: string): Promise<GooglePhotosListResponse> {
    const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems');
    url.searchParams.append('pageSize', String(pageSize));
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }
    
    console.log('Google Photos API Request (GET):', {
      url: url.toString(),
      hasAccessToken: !!this.accessToken
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Google Photos API Error (Full Body):', JSON.stringify(error, null, 2));

      if (response.status === 403) {
        const message = error.error?.message || 'Google denied access to Google Photos.';
        throw new GooglePhotosError(
          `Access Denied (403): ${message} This usually means the legacy Google Photos Library API is no longer available for this flow. Use the Google Photos Picker API instead.`,
          'api_denied',
          403
        );
      }

      throw new GooglePhotosError(
        `Failed to list photos: ${error.error?.message || response.statusText}`,
        'network_error',
        response.status
      );
    }

    const data = await response.json();
    return {
      photos: data.mediaItems || [],
      nextPageToken: data.nextPageToken,
    };
  }

  /**
   * Gets a specific photo by ID
   */
  async getPhoto(photoId: string): Promise<GooglePhoto> {
    const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems/${photoId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GooglePhotosError(
        `Failed to get photo: ${error.error?.message || response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }

    return await response.json();
  }

  /**
   * Gets the download URL for a photo
   * Google Photos provides baseUrl which can be used to download the image
   */
  getPhotoDownloadUrl(photo: GooglePhoto, width?: number, height?: number): string {
    const baseUrl = photo.baseUrl;

    if (width && height) {
      // Request specific dimensions
      return `${baseUrl}=w${width}-h${height}`;
    } else if (width) {
      // Request specific width
      return `${baseUrl}=w${width}`;
    } else if (height) {
      // Request specific height
      return `${baseUrl}=h${height}`;
    }

    // Return original size
    return `${baseUrl}=d`;
  }

  /**
   * Downloads a photo as a Blob
   * @param photo The photo to download
   * @param width Optional width for resizing
   * @param height Optional height for resizing
   */
  async downloadPhoto(photo: GooglePhoto, width?: number, height?: number): Promise<Blob> {
    const url = this.getPhotoDownloadUrl(photo, width, height);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    if (!response.ok) {
      throw new GooglePhotosError(
        `Failed to download photo: ${response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }

    return await response.blob();
  }

  async createPickerSession(maxItemCount: number = 15): Promise<GooglePhotosPickerSession> {
    const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickingConfig: {
          maxItemCount: String(Math.min(Math.max(maxItemCount, 1), 2000)),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GooglePhotosError(
        `Failed to create Google Photos Picker session: ${error.error?.message || response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }

    return await response.json();
  }

  async getPickerSession(sessionId: string): Promise<GooglePhotosPickerSession> {
    const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GooglePhotosError(
        `Failed to get Google Photos Picker session: ${error.error?.message || response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }

    return await response.json();
  }

  async listPickerMediaItems(
    sessionId: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<GooglePhotosPickerMediaItemsResponse> {
    const url = new URL('https://photospicker.googleapis.com/v1/mediaItems');
    url.searchParams.set('sessionId', sessionId);
    url.searchParams.set('pageSize', String(pageSize));
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GooglePhotosError(
        `Failed to list picked media items: ${error.error?.message || response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }

    return await response.json();
  }

  async deletePickerSession(sessionId: string): Promise<void> {
    const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({}));
      throw new GooglePhotosError(
        `Failed to delete Google Photos Picker session: ${error.error?.message || response.statusText}`,
        response.status === 403 ? 'api_denied' : 'network_error',
        response.status
      );
    }
  }

  convertPickedMediaItemToGooglePhoto(item: GooglePhotosPickedMediaItem): GooglePhoto {
    const metadata = item.mediaFile.mediaFileMetadata || {};
    const photoMetadata = metadata.photoMetadata;

    return {
      id: item.id,
      baseUrl: item.mediaFile.baseUrl,
      filename: item.mediaFile.filename,
      mimeType: item.mediaFile.mimeType,
      creationTime: item.createTime,
      mediaMetadata: {
        width: String(metadata.width || 0),
        height: String(metadata.height || 0),
        photo: photoMetadata
          ? {
              cameraMake: metadata.cameraMake,
              cameraModel: metadata.cameraModel,
              focalLength: photoMetadata.focalLength,
              apertureFNumber: photoMetadata.apertureFNumber,
              isoEquivalent: photoMetadata.isoEquivalent,
              exposureTime: photoMetadata.exposureTime,
            }
          : undefined,
      },
    };
  }

  /**
   * Extracts GPS coordinates from Google Photos metadata
   */
  extractGPS(photo: GooglePhoto): { lat?: number; lng?: number } {
    if (photo.locationInfo?.latitude && photo.locationInfo?.longitude) {
      return {
        lat: photo.locationInfo.latitude,
        lng: photo.locationInfo.longitude,
      };
    }
    return {};
  }

  /**
   * Extracts creation date from Google Photos metadata
   */
  extractCreationDate(photo: GooglePhoto): Date | undefined {
    if (photo.creationTime) {
      return new Date(photo.creationTime);
    }
    return undefined;
  }

  /**
   * Converts a Google Photo to a format compatible with the upload pipeline
   * Attempts to extract GPS data from the actual image bytes (EXIF) since the API strips it
   */
  async convertToUploadFormat(photo: GooglePhoto): Promise<{
    file: Blob;
    lat?: number;
    lng?: number;
    takenAt?: Date;
    filename: string;
  }> {
    // We must download the original bytes (=d) or a high-res version to ensure EXIF is preserved
    // Google often strips EXIF from resized thumbnails, so we get a large version
    const blob = await this.downloadPhoto(photo, 1600, 1600);
    const filename = photo.filename;

    let lat: number | undefined;
    let lng: number | undefined;
    let takenAt = this.extractCreationDate(photo);

    try {
      console.log(`🔍 Scanning image bytes for EXIF data: ${filename}...`);
      // Use exifr to parse the downloaded blob
      const exif = await exifr.parse(blob, {
        gps: true,
        timestamp: true
      });

      if (exif) {
        if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
          lat = exif.latitude;
          lng = exif.longitude;
          console.log(`📍 Found EXIF GPS for ${filename}: ${lat}, ${lng}`);
        }

        if (exif.DateTimeOriginal instanceof Date) {
          takenAt = exif.DateTimeOriginal;
          console.log(`📅 Found EXIF Date for ${filename}: ${takenAt.toISOString()}`);
        }
      } else {
        console.log(`ℹ️ No EXIF data found in image bytes for ${filename}`);
      }
    } catch (exifError) {
      console.warn(`⚠️ EXIF extraction failed for ${filename}:`, exifError);
    }

    return {
      file: blob,
      lat,
      lng,
      takenAt,
      filename,
    };
  }
}

/**
 * Rate limiter for Google Photos API requests
 * Google Photos API has a quota of 10,000 requests per day
 */
export class GooglePhotosRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private maxConcurrent = 5; // Max 5 concurrent requests

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if we've reached max concurrent requests
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.activeRequests++;

    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}

/**
 * Creates a Google Photos client with rate limiting
 */
export function createGooglePhotosClient(accessToken: string): {
  client: GooglePhotosClient;
  rateLimiter: GooglePhotosRateLimiter;
} {
  return {
    client: new GooglePhotosClient(accessToken),
    rateLimiter: new GooglePhotosRateLimiter(),
  };
}
