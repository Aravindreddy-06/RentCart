/**
 * src/config/cloudinary.ts
 * Configures the Cloudinary v2 SDK using environment variables.
 * Enforces secure: true for all generated HTTPS delivery URLs.
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;
