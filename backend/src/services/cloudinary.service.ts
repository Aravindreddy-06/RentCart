/**
 * src/services/cloudinary.service.ts
 * Cloudinary image upload and deletion service.
 * Handles buffer streaming, incoming optimization, EXIF stripping,
 * magic bytes verification, and background asset cleanup.
 */

import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from '../config/cloudinary';
import { env } from '../config/env';

export class CloudinaryUploadError extends Error {
  statusCode: number;

  constructor(
    message = 'Image upload service is currently unavailable. Please try again later.',
    statusCode = 502,
  ) {
    super(message);
    this.name = 'CloudinaryUploadError';
    this.statusCode = statusCode;
  }
}

/**
 * Validates file buffer magic bytes to ensure the content is truly
 * a JPEG, PNG, or WebP image regardless of reported extension or mimetype.
 */
export function isAllowedImageBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return true;

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;
  if (isWebp) return true;

  return false;
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

/**
 * Uploads a file buffer to Cloudinary using upload_stream.
 * - Stores in folders: 'rentcart/items' or 'rentcart/avatars'
 * - Uses unique public id (uuidv4)
 * - Limits size to 1600px on the longest side (crop: limit)
 * - Sets quality auto
 * - Strips EXIF / GPS metadata (flags: force_strip)
 */
export function uploadImageStream(
  buffer: Buffer,
  folder: 'rentcart/items' | 'rentcart/avatars',
): Promise<UploadResult> {
  if (env.CLOUDINARY_MOCK) {
    if (env.NODE_ENV !== 'test') {
      throw new Error('CLOUDINARY_MOCK is only permitted when NODE_ENV=test');
    }
    const publicId = `${folder}/${uuidv4()}`;
    return Promise.resolve({
      secureUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v1234567890/${publicId}.jpg`,
      publicId,
    });
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: uuidv4(),
        resource_type: 'image',
        transformation: [
          {
            width: 1600,
            height: 1600,
            crop: 'limit',
            quality: 'auto',
            flags: 'force_strip',
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          const errStatus = error?.http_code || 502;
          console.error('[Cloudinary Upload Error]', error?.message || 'Empty response');
          return reject(
            new CloudinaryUploadError(
              'Image upload service is currently unavailable. Please try again later.',
              errStatus >= 500 && errStatus < 600 ? errStatus : 502,
            ),
          );
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Extracts public id from a Cloudinary URL if and only if:
 * 1. The URL points to our Cloudinary cloud.
 * 2. The asset is located within the "rentcart/" folder.
 * Returns null if the URL is local, external, from another cloud, or outside "rentcart/".
 */
export function extractCloudinaryPublicId(
  url: string | null | undefined,
  cloudName: string = env.CLOUDINARY_CLOUD_NAME,
): string | null {
  if (!url || typeof url !== 'string') return null;

  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!url.toLowerCase().startsWith(prefix.toLowerCase())) return null;

  const pathPart = url.slice(prefix.length);
  const rentcartIdx = pathPart.indexOf('rentcart/');
  if (rentcartIdx === -1) return null;

  const fromRentcart = pathPart.slice(rentcartIdx);
  const withoutQuery = fromRentcart.split(/[?#]/)[0];
  if (!withoutQuery) return null;

  const lastDot = withoutQuery.lastIndexOf('.');
  return lastDot !== -1 ? withoutQuery.slice(0, lastDot) : withoutQuery;
}

/**
 * Deletes a single Cloudinary asset in the background.
 * A cleanup failure must NEVER throw or fail the main request.
 */
export async function deleteCloudinaryAsset(url: string | null | undefined): Promise<void> {
  if (env.CLOUDINARY_MOCK) return;
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err: any) {
    console.error(`[Cloudinary Cleanup Warning] Failed to delete asset ${publicId}:`, err?.message || err);
  }
}

/**
 * Deletes multiple Cloudinary assets in the background.
 * Non-blocking, fails gracefully.
 */
export function deleteCloudinaryAssets(urls: (string | null | undefined)[]): void {
  if (!urls || urls.length === 0) return;
  Promise.allSettled(urls.map((u) => deleteCloudinaryAsset(u))).catch(() => {
    // Intentionally swallowed to ensure background safety
  });
}
