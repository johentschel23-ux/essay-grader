import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extract text content from a PDF file with page markers
 * @param {string} pdfData - The PDF file data as a base64 string
 * @returns {Promise<string>} - Text content with [PAGE X] markers
 */
export const extractTextFromPdf = async (pdfData) => {
  try {
    // Set the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData.split(',')[1]) });
    const pdf = await loadingTask.promise;
    
    let fullTextContent = '';
    
    // Get text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Add page marker
      fullTextContent += `[PAGE ${i}]\n`;
      
      // Extract text items and join them
      const pageText = content.items.map(item => item.str).join(' ');
      fullTextContent += pageText + '\n\n'; // Add double newline for separation between pages
    }
    
    return fullTextContent.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return ''; // Return empty string on error
  }
};

// Create a named export object
const pdfUtils = {
  extractTextFromPdf
};

export default pdfUtils;
