import {PDFDocument} from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as logger from 'firebase-functions/logger';

// Document AI limits:
// - Non-imageless mode: 15 pages
// - Imageless mode (if enabled on processor): 30 pages
// We use 15 as the safe limit to ensure compatibility
const MAX_PAGES_PER_CHUNK = 15;

/**
 * Get the number of pages in a PDF file
 */
export async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    logger.error('Error getting PDF page count:', error);
    throw new Error(`Failed to get PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Split a PDF into chunks of MAX_PAGES_PER_CHUNK pages
 * Returns array of temporary file paths for each chunk
 */
export async function splitPdfIntoChunks(
  filePath: string,
  tempDir: string = '/tmp'
): Promise<string[]> {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pageCount = sourcePdf.getPageCount();

    logger.info(`Splitting PDF with ${pageCount} pages into chunks of ${MAX_PAGES_PER_CHUNK} pages`);

    // If PDF is within limits, return original file path
    if (pageCount <= MAX_PAGES_PER_CHUNK) {
      return [filePath];
    }

    const chunkPaths: string[] = [];
    const baseFileName = path.basename(filePath, '.pdf');
    const numChunks = Math.ceil(pageCount / MAX_PAGES_PER_CHUNK);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {recursive: true});
    }

    // Split PDF into chunks
    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const startPage = chunkIndex * MAX_PAGES_PER_CHUNK;
      const endPage = Math.min(startPage + MAX_PAGES_PER_CHUNK, pageCount);

      logger.info(`Creating chunk ${chunkIndex + 1}/${numChunks} (pages ${startPage + 1}-${endPage})`);

      // Create new PDF document for this chunk
      const chunkPdf = await PDFDocument.create();

      // Copy pages from source PDF to chunk PDF
      const pagesToCopy = [];
      for (let i = startPage; i < endPage; i++) {
        pagesToCopy.push(i);
      }

      const copiedPages = await chunkPdf.copyPages(sourcePdf, pagesToCopy);
      copiedPages.forEach((page) => chunkPdf.addPage(page));

      // Save chunk to temporary file
      const chunkBytes = await chunkPdf.save();
      const chunkFileName = `${baseFileName}_chunk_${chunkIndex + 1}_of_${numChunks}_${Date.now()}.pdf`;
      const chunkPath = path.join(tempDir, chunkFileName);
      fs.writeFileSync(chunkPath, chunkBytes);

      chunkPaths.push(chunkPath);
      logger.info(`Saved chunk ${chunkIndex + 1} to ${chunkPath}`);
    }

    logger.info(`Successfully split PDF into ${chunkPaths.length} chunks`);
    return chunkPaths;
  } catch (error) {
    logger.error('Error splitting PDF:', error);
    throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up temporary PDF chunk files
 */
export function cleanupPdfChunks(chunkPaths: string[]): void {
  chunkPaths.forEach((chunkPath) => {
    try {
      if (fs.existsSync(chunkPath) && chunkPath.includes('_chunk_')) {
        fs.unlinkSync(chunkPath);
        logger.info(`Cleaned up PDF chunk: ${chunkPath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up PDF chunk ${chunkPath}:`, error);
    }
  });
}

