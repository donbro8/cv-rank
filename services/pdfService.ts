import * as pdfjsLib from 'pdfjs-dist';

// We pin the version to match index.html to ensure the worker is compatible.
const PDFJS_VERSION = '4.10.38';
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Robustly get 'getDocument'. In some ESM environments, it might be on the default export.
    const getDocument = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;

    if (!getDocument) {
      throw new Error("PDF.js library could not be initialized correctly.");
    }

    const loadingTask = getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Basic validation: if no text found, it might be an image-only PDF
    if (!fullText.trim()) {
       console.warn(`Warning: No text found in ${file.name}. It might be an image-only PDF.`);
       // We return empty string instead of throwing, to allow partial success in bulk uploads
       return ""; 
    }

    return fullText;
  } catch (error: any) {
    console.error(`Error parsing PDF ${file.name}:`, error);
    // Provide a more user-friendly error message if possible
    if (error.name === 'MissingPDFException') {
      throw new Error("File is not a valid PDF.");
    }
    throw new Error(error.message || "Failed to extract text from PDF.");
  }
};

export const readFileContent = async (file: File): Promise<string> => {
  // Handle Text files
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    return await file.text();
  }
  
  // Handle PDF files
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPdf(file);
  }
  
  throw new Error(`Unsupported file type: ${file.type}`);
};