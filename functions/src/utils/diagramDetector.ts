/**
 * Heuristic to detect if an image needs diagram understanding
 */

export function shouldUseDiagramUnderstanding(
  fileType: string,
  extractedText: string
): boolean {
  // Always consider image files for diagram understanding
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (imageTypes.includes(fileType.toLowerCase())) {
    // Check if minimal text was extracted
    const wordCount = extractedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    // If less than 50 words, likely a diagram
    return wordCount < 50;
  }
  
  return false;
}

