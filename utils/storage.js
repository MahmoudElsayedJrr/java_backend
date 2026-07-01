const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { STORAGE_BUCKETS } = require('../constants');
const { AppError }        = require('../utils/errors');
const logger              = require('../config/logger');

/**
 * Upload a file buffer to a Supabase Storage bucket
 * Returns the public URL of the uploaded file
 */
const uploadImage = async (fileBuffer, originalName, bucket) => {
  const ext      = path.extname(originalName).toLowerCase();
  const filename = `${uuidv4()}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, fileBuffer, {
      contentType: _mimeType(ext),
      upsert: false,
    });

  if (error) {
    logger.error('[Storage] Upload failed', { bucket, error: error.message });
    throw new AppError(`Image upload failed: ${error.message}`, 500);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
};

/**
 * Delete a file from Supabase Storage by its public URL
 */
const deleteImage = async (publicUrl, bucket) => {
  if (!publicUrl) return;

  // Extract filename from URL
  const parts    = publicUrl.split('/');
  const filename = parts[parts.length - 1];

  const { error } = await supabase.storage.from(bucket).remove([filename]);

  if (error) {
    // Log but don't throw — deletion failure is non-critical
    logger.warn('[Storage] Delete failed', { bucket, filename, error: error.message });
  }
};

/**
 * Upload a product image
 */
const uploadProductImage = (fileBuffer, originalName) =>
  uploadImage(fileBuffer, originalName, STORAGE_BUCKETS.PRODUCTS);

/**
 * Upload a category image
 */
const uploadCategoryImage = (fileBuffer, originalName) =>
  uploadImage(fileBuffer, originalName, STORAGE_BUCKETS.CATEGORIES);

/**
 * Delete a product image
 */
const deleteProductImage = (publicUrl) =>
  deleteImage(publicUrl, STORAGE_BUCKETS.PRODUCTS);

/**
 * Delete a category image
 */
const deleteCategoryImage = (publicUrl) =>
  deleteImage(publicUrl, STORAGE_BUCKETS.CATEGORIES);

// ── Private helpers ─────────────────────────────────────────

const _mimeType = (ext) => {
  const map = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
  };
  return map[ext] || 'application/octet-stream';
};

module.exports = {
  uploadProductImage,
  uploadCategoryImage,
  deleteProductImage,
  deleteCategoryImage,
};
