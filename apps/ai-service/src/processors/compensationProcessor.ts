import { GeminiService } from '../services/geminiService';

interface Dictionary<T> {
    [key: string]: T;
}

export class CompensationProcessor {
    private geminiService: GeminiService;

    // Mock Market Data (in a real app, this would come from an API or DB)
    private marketData: Dictionary<{ min: number; max: number; avg: number; currency: string }> = {
        'software engineer': { min: 100000, max: 180000, avg: 140000, currency: 'USD' },
        'senior software engineer': { min: 140000, max: 220000, avg: 180000, currency: 'USD' },
        'product manager': { min: 110000, max: 190000, avg: 150000, currency: 'USD' },
        'data scientist': { min: 120000, max: 200000, avg: 160000, currency: 'USD' },
        'default': { min: 80000, max: 150000, avg: 110000, currency: 'USD' }
    };

    constructor() {
        this.geminiService = new GeminiService();
    }

    async analyze(text: string, roleTitle: string = 'default') {
        // 1. Extract candidate expectations
        const extraction = await this.geminiService.extractCompensation(text);

        // 2. Normalize role title for mock data lookup (very basic)
        const normalizedRole = Object.keys(this.marketData).find(key =>
            roleTitle.toLowerCase().includes(key)
        ) || 'default';

        const market = this.marketData[normalizedRole];

        // 3. Compare
        const analysis = {
            candidateExpectation: extraction,
            marketBenchmark: {
                role: normalizedRole,
                ...market
            },
            assessment: 'Unknown'
        };

        if (extraction.min && extraction.min > market.max) {
            analysis.assessment = 'Above Market';
        } else if (extraction.max && extraction.max < market.min) {
            analysis.assessment = 'Below Market';
        } else if (extraction.min && extraction.min >= market.min && extraction.max && extraction.max <= market.max) {
            analysis.assessment = 'Within Market Range';
        } else {
            analysis.assessment = 'Competitive / Ambiguous';
        }

        return analysis;
    }
}
