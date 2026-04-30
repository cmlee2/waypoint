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

/**
 * Google Photos API client for accessing user's photos
 */
export class GooglePhotosClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Lists photos from the user's Google Photos library
   * @param pageSize Number of photos to return (max 100)
   * @param pageToken Token for pagination
   */
  async listPhotos(pageSize: number = 50, pageToken?: string): Promise<GooglePhotosListResponse> {
    const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems:search');
    url.searchParams.append('pageSize', String(pageSize));

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageSize,
        pageToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list photos: ${error.error?.message || response.statusText}`);
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
      const error = await response.json();
      throw new Error(`Failed to get photo: ${error.error?.message || response.statusText}`);
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

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.statusText}`);
    }

    return await response.blob();
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
   */
  async convertToUploadFormat(photo: GooglePhoto): Promise<{
    file: Blob;
    lat?: number;
    lng?: number;
    takenAt?: Date;
    filename: string;
  }> {
    const blob = await this.downloadPhoto(photo, 1600, 1600); // Compress to max 1600x1600
    const { lat, lng } = this.extractGPS(photo);
    const takenAt = this.extractCreationDate(photo);

    return {
      file: blob,
      lat,
      lng,
      takenAt,
      filename: photo.filename,
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
