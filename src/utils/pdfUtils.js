import * as pdfjsLib from 'pdfjs-dist';

// Determine if running in Electron
const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);

let workerSrcValue;

if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getPdfWorkerPath === 'function') {
  // Use the robust Electron preload path
  workerSrcValue = window.electronAPI.getPdfWorkerPath('js');
} else if (isElectron) {
  if (process.env.NODE_ENV === 'development') {
    workerSrcValue = '/pdf.worker.min.js';
  } else {
    workerSrcValue = '../pdf.worker.min.js';
  }
} else {
  workerSrcValue = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcValue;

console.log(
  `[pdfUtils.js] PDF.js worker source configured:\n  Path: ${pdfjsLib.GlobalWorkerOptions.workerSrc}\n  isElectron: ${isElectron}\n  NODE_ENV: ${process.env.NODE_ENV}\n  pdfjsLib.version: ${pdfjsLib.version}`
);

/**
 * Extract text content from a PDF file with page markers
 * @param {string | File | Blob} pdfData - The PDF file data (e.g., base64 string, URL, File, or Blob)
 * @returns {Promise<string>} - Text content with [PAGE X] markers
 */
export const extractTextFromPdf = async (pdfData) => {
  try {
    // Worker source is now set globally above this function.

    let documentSource = pdfData;
    if (typeof pdfData === 'string' && pdfData.startsWith('data:application/pdf;base64,')) {
      const base64Part = pdfData.substring('data:application/pdf;base64,'.length);
      if (!base64Part) throw new Error("Invalid base64 data URI for PDF.");
      documentSource = { data: atob(base64Part) };
    } else if (typeof pdfData === 'string' && pdfData.startsWith('blob:')){
      documentSource = pdfData; // getDocument can handle blob URLs directly
    } else if (pdfData instanceof File || pdfData instanceof Blob) {
      documentSource = await pdfData.arrayBuffer(); // Convert File/Blob to ArrayBuffer
    } else if (typeof pdfData === 'string') {
      // Assume it's a direct URL if not a data URI or blob URI
      documentSource = { url: pdfData };
    }

    const loadingTask = pdfjsLib.getDocument(documentSource);
    const pdf = await loadingTask.promise;
    
    let fullTextContent = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      fullTextContent += `[PAGE ${i}]\n`;
      const pageText = content.items.map(item => item.str).join(' ');
      fullTextContent += pageText + '\n\n';
    }
    
    return fullTextContent.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return ''; 
  }
};

// Create a named export object
const pdfUtils = {
  extractTextFromPdf
};

export default pdfUtils;