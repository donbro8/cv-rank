import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
    PORT: z.string().default('8080'),
    PROJECT_ID: z.string(),
    LOCATION: z.string().default('us-central1'),
    PINECONE_API_KEY: z.string(),
    PINECONE_INDEX: z.string(),
});

const processEnv = {
    PORT: process.env.PORT,
    PROJECT_ID: process.env.PROJECT_ID,
    LOCATION: process.env.LOCATION,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX
}

const parsed = configSchema.safeParse(processEnv);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const config = parsed.data;
