import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GeminiService } from './services/geminiService';
import { VectorService } from './services/vectorService';
import { ResumeProcessor } from './processors/resumeProcessor';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const geminiService = new GeminiService();
const vectorService = new VectorService();
const resumeProcessor = new ResumeProcessor();

app.get('/', (req, res) => {
    res.send('AI Service is running');
});

// Direct generation (chat/etc)
app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).send('Prompt is required');
        }
        const text = await geminiService.generateContent(prompt);
        res.json({ text });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Raw processing to get embedding
app.post('/embed', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('Text is required');
        }
        const embedding = await geminiService.generateEmbedding(text);
        res.json({ embedding });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Process uploaded Resume PDF from Storage
app.post('/process-resume', async (req, res) => {
    try {
        const { bucketName, filePath, metadata } = req.body;
        if (!bucketName || !filePath) {
            return res.status(400).send('bucketName and filePath are required');
        }

        const result = await resumeProcessor.processResume(bucketName, filePath, metadata || {});
        res.json(result);
    } catch (error) {
        console.error('Error processing resume:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Upsert generic text (e.g. Job Specs)
app.post('/upsert-text', async (req, res) => {
    try {
        const { text, id, metadata } = req.body;
        if (!text || !id || !metadata) {
            return res.status(400).send('text, id, and metadata are required');
        }

        const embedding = await geminiService.generateEmbedding(text);

        await vectorService.upsertVector(id, embedding, {
            ...metadata,
            textSnippet: text.substring(0, 1000)
        });

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error upserting text:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Semantic Search
app.post('/search', async (req, res) => {
    try {
        const { query, filter, topK } = req.body;
        if (!query) {
            return res.status(400).send('Query is required');
        }

        // 1. Embed the query
        const embedding = await geminiService.generateEmbedding(query);

        // 2. Search Pinecone
        const results = await vectorService.queryVectors(
            embedding,
            filter,
            topK || 10
        );

        res.json({ results });
    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
