const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { STORAGE_BUCKETS } = require('../constants');
const { AppError }        = require('../utils/errors');
const logger              = require('../config/logger');


const uploadImage = async (fileBuffer, originalName, bucket) => {
  const decodedName = decodeURIComponent(originalName || 'product');
  let ext = path.extname(decodedName).toLowerCase();
  if (!ext || ext.length > 5) ext = '.jpg';
  
  const baseName = path.basename(decodedName, ext);
  let cleanBaseName = baseName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleanBaseName) cleanBaseName = 'product';

  const uniqueSuffix = uuidv4().substring(0, 8);
  const filename = `${cleanBaseName}_${uniqueSuffix}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, fileBuffer, {
      contentType: _mimeType(ext),
      upsert: true,
    });

  if (error) {
    logger.error('[Storage] Upload failed', { bucket, error: error.message });
    throw new AppError(`Image upload failed: ${error.message}`, 500);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
};


const deleteImage = async (publicUrl, bucket) => {
  if (!publicUrl) return;

  try {
    const parts = publicUrl.split('/');
    const filename = decodeURIComponent(parts[parts.length - 1]);

    if (filename) {
      const { error } = await supabase.storage.from(bucket).remove([filename]);
      if (error) {
        logger.warn('[Storage] Delete failed', { bucket, filename, error: error.message });
      } else {
        logger.info('[Storage] Successfully deleted old image', { bucket, filename });
      }
    }
  } catch (err) {
    logger.warn('[Storage] Failed to parse public URL for deletion', { publicUrl, error: err.message });
  }
};


const uploadProductImage = (fileBuffer, originalName) =>
  uploadImage(fileBuffer, originalName, STORAGE_BUCKETS.PRODUCTS);


const uploadCategoryImage = (fileBuffer, originalName) =>
  uploadImage(fileBuffer, originalName, STORAGE_BUCKETS.CATEGORIES);


const deleteProductImage = (publicUrl) =>
  deleteImage(publicUrl, STORAGE_BUCKETS.PRODUCTS);


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
