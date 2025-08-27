import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS properly for Figma plugins
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like Figma plugins) or from allowed origins
        if (!origin || origin === 'null' || 
            origin === 'https://www.figma.com' || 
            origin === 'https://figma.com') {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now to debug
        }
    },
    methods: ['POST', 'OPTIONS', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'Critique Assistant Proxy Running', 
        timestamp: new Date().toISOString() 
    });
});

// Main analysis endpoint
app.post('/api/proxy', async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('Request received:', {
            timestamp: new Date().toISOString(),
            bodySize: JSON.stringify(req.body).length,
            origin: req.headers.origin || 'null'
        });

        // Prepare request to OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',
                max_tokens: 4000,
                temperature: 0.1,
                messages: [
                    {
                        role: 'system',
                        content: process.env.UX_PROMPT || 'You are a UX analysis assistant. Analyze the provided design and return feedback as JSON.'
                    },
                    {
                        role: 'user',
                        content: `Design Analysis Request:

Context: ${req.body.context || 'General UX analysis'}
Design Data: ${JSON.stringify(req.body.frames)}
Focus Areas: ${req.body.contextAnalysis ? JSON.stringify(req.body.contextAnalysis) : 'General usability'}`
                    }
                ]
            })
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
        }

        const result = await openaiResponse.json();
        const processingTime = Date.now() - startTime;

        console.log('Analysis completed:', {
            processingTime: `${processingTime}ms`,
            responseLength: result.choices[0]?.message?.content?.length || 0
        });

        res.json({
            content: result.choices[0]?.message?.content || '[]',
            processingTime,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Proxy error:', error);
        const processingTime = Date.now() - startTime;
        
        res.status(500).json({
            error: 'Analysis failed: ' + error.message,
            processingTime,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Critique Assistant Proxy running on port ${port}`);
});