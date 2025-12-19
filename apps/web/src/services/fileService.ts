import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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

        if (!fullText.trim()) {
            console.warn(`Warning: No text found in ${file.name}. It might be an image-only PDF.`);
            return "";
        }
        return fullText;
    } catch (error: any) {
        console.error(`Error parsing PDF ${file.name}:`, error);
        if (error.name === 'MissingPDFException') throw new Error("File is not a valid PDF.");
        throw new Error(error.message || "Failed to extract text from PDF.");
    }
};

const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

const extractTextFromXlsx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
        const rowObject = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        rowObject.forEach((row: any) => {
            text += row.join(' ') + '\n';
        });
    });
    return text;
};

export const readFileContent = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();

    if (file.type === 'text/plain' || name.endsWith('.txt')) {
        return await file.text();
    }

    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
        return extractTextFromPdf(file);
    }

    if (name.endsWith('.docx') || name.endsWith('.doc')) {
        return extractTextFromDocx(file);
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        return extractTextFromXlsx(file);
    }

    throw new Error(`Unsupported file type: ${file.type}`);
};

export const extractMetadata = async (text: string) => {
    // Basic heuristic extraction
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const emailMatch = text.match(emailRegex);

    // Very naive Name extraction (assumes name is often at the top)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const possibleName = lines.length > 0 ? lines[0] : "Unknown Candidate";

    // Basic skills keyword matching (expand this list as needed)
    const commonSkills = ["React", "TypeScript", "JavaScript", "Python", "Java", "C++", "AWS", "Firebase", "Node.js", "SQL", "Docker", "Kubernetes", "Go", "Rust"];
    const foundSkills = commonSkills.filter(skill =>
        text.toLowerCase().includes(skill.toLowerCase())
    );

    return {
        name: possibleName,
        email: emailMatch ? emailMatch[0] : "",
        skills: foundSkills,
        summary: text.slice(0, 200) + "..." // Simple summary
    };
};

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";

export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};
