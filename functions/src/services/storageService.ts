import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Download file from Firebase Storage to local temp directory
 */
export async function downloadFileFromStorage(
  storageUrl: string,
  tempDir: string = '/tmp'
): Promise<{filePath: string; fileName: string; mimeType: string}> {
  try {
    // Parse the storage URL to get bucket and file path
    const bucket = admin.storage().bucket();
    
    // Extract file path from URL using the shared helper
    // Handle gs:// URLs separately as they need bucket checking
    let filePath = '';
    let targetBucket = bucket;
    
    if (storageUrl.startsWith('gs://')) {
      // Handle gs:// URLs
      const parts = storageUrl.replace('gs://', '').split('/');
      const bucketName = parts[0];
      filePath = parts.slice(1).join('/');
      
      if (bucketName !== bucket.name) {
        targetBucket = admin.storage().bucket(bucketName);
      }
    } else {
      // Extract file path from HTTPS Firebase Storage URL
      filePath = extractFilePathFromUrl(storageUrl);
    }
    
    logger.info(`Extracted file path from URL: ${filePath}`);
    logger.info(`Using bucket: ${targetBucket.name}`);
    
    const file = targetBucket.file(filePath);
    
    // Verify file exists and get metadata
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }
    
    const [metadata] = await file.getMetadata();
    const mimeType = metadata.contentType || 'application/octet-stream';
    const fileName = path.basename(filePath);
    const localFilePath = path.join(tempDir, `${Date.now()}_${fileName}`);
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {recursive: true});
    }
    
    // Download file
    await file.download({destination: localFilePath});
    
    logger.info(`Downloaded file from Storage: ${filePath} to ${localFilePath}`);
    logger.info(`File size: ${metadata.size} bytes, MIME type: ${mimeType}`);
    
    return {
      filePath: localFilePath,
      fileName: fileName,
      mimeType: mimeType,
    };
  } catch (error) {
    logger.error('Error downloading file from Storage:', error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract file path from Firebase Storage URL (shared helper)
 */
function extractFilePathFromUrl(storageUrl: string): string {
  let filePath = '';
  
  try {
    const url = new URL(storageUrl);
    
    // Extract the path from the URL (everything after /o/)
    const pathMatch = url.pathname.match(/\/o\/(.+)/);
    if (pathMatch) {
      // The path is URL-encoded in the Firebase Storage URL
      // We need to decode it, handling %2F (encoded forward slashes) properly
      let encodedPath = pathMatch[1];
      
      // Replace %2F with a temporary placeholder before decoding, then restore slashes
      const placeholder = '___SLASH___';
      encodedPath = encodedPath.replace(/%2F/g, placeholder);
      filePath = decodeURIComponent(encodedPath);
      filePath = filePath.replace(new RegExp(placeholder, 'g'), '/');
      
      // Also handle any remaining encoded characters
      filePath = filePath.replace(/%20/g, ' '); // spaces
      filePath = filePath.replace(/%5B/g, '['); // brackets
      filePath = filePath.replace(/%5D/g, ']');
    } else {
      throw new Error('Invalid storage URL format: missing /o/ path');
    }
  } catch (urlError: any) {
    logger.warn(`Error parsing storage URL: ${urlError.message}, trying alternatives...`);
    
    // If URL parsing fails, try to extract from gs:// URL
    if (storageUrl.startsWith('gs://')) {
      const parts = storageUrl.replace('gs://', '').split('/');
      filePath = parts.slice(1).join('/');
    } else {
      // Assume it's already a file path relative to bucket (for backwards compatibility)
      filePath = storageUrl;
    }
  }
  
  return filePath;
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteFileFromStorage(storageUrl: string): Promise<void> {
  try {
    const bucket = admin.storage().bucket();
    
    // Extract file path from URL using the shared helper
    const filePath = extractFilePathFromUrl(storageUrl);
    
    if (filePath) {
      const file = bucket.file(filePath);
      await file.delete();
      logger.info(`Deleted file from Storage: ${filePath}`);
    } else {
      logger.warn(`Could not extract file path from URL: ${storageUrl}`);
    }
  } catch (error) {
    logger.error('Error deleting file from Storage:', error);
    // Don't throw - deletion failure shouldn't fail the whole operation
  }
}

/**
 * Convert file to base64 string
 */
export function fileToBase64(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
  } catch (error) {
    logger.error('Error converting file to base64:', error);
    throw new Error(`Failed to convert file to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up temp file: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error cleaning up temp file:', error);
  }
}

/**
 * Upload file from base64 data to Firebase Storage (server-side)
 * Returns the Storage URL for the uploaded file
 */
export async function uploadFileFromBase64(
  base64Data: string,
  fileName: string,
  fileType: 'pdf' | 'image',
  userId: string
): Promise<string> {
  try {
    const bucket = admin.storage().bucket();
    
    // Convert base64 to Buffer (Node.js native, no Blob issues)
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique file path: uploads/{userId}/{timestamp}_{random}_{filename}
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const storageFileName = `${timestamp}_${randomSuffix}_${fileName}`;
    const storagePath = `uploads/${userId}/${storageFileName}`;
    
    // Determine MIME type based on file type and extension
    let mimeType: string;
    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
    } else {
      // Determine image MIME type from file extension
      const extension = fileName.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        default:
          mimeType = 'image/jpeg'; // Default fallback
      }
    }
    
    logger.info(`Uploading file to Storage: ${storagePath}`);
    logger.info(`File size: ${buffer.length} bytes, MIME type: ${mimeType}`);
    
    // Upload to Firebase Storage using Admin SDK
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      contentType: mimeType,
      metadata: {
        userId: userId,
        originalName: fileName,
      },
    });
    
    // Get public URL or signed URL
    // For processing, we need a URL that can be accessed by the Cloud Function
    // We'll use the gs:// URL format which works well with Admin SDK
    const storageUrl = `gs://${bucket.name}/${storagePath}`;
    
    logger.info(`File uploaded successfully to Storage: ${storageUrl}`);
    
    return storageUrl;
  } catch (error) {
    logger.error('Error uploading file from base64 to Storage:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

