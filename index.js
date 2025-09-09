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
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'OPTIONS', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
}));

// Increased limit for complex designs - Railway can handle larger payloads
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'Critique Assistant Proxy Running on Railway', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Main analysis endpoint - optimized for complex designs
app.post('/api/proxy', async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('Request received:', {
            timestamp: new Date().toISOString(),
            bodySize: JSON.stringify(req.body).length,
            origin: req.headers.origin || 'null',
            framesCount: req.body.frames?.length || 0
        });

        // Validate request but allow larger payloads for complex designs
        const payloadSize = JSON.stringify(req.body).length;
        if (payloadSize > 50 * 1024 * 1024) { // 50MB limit for Railway
            return res.status(413).json({
                error: 'Request too large - even for complex designs, please select fewer frames',
                timestamp: new Date().toISOString()
            });
        }

        // Validate required environment variables
        if (!process.env.OPENAI_API_KEY) {
            console.error('Missing OPENAI_API_KEY environment variable');
            return res.status(500).json({
                error: 'Server configuration error',
                timestamp: new Date().toISOString()
            });
        }

        if (!process.env.UX_PROMPT) {
            console.error('Missing UX_PROMPT environment variable');
            return res.status(500).json({
                error: 'Analysis prompt not configured',
                timestamp: new Date().toISOString()
            });
        }

        // Extended timeout for complex design analysis
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes for complex designs

        try {
            // Prepare request to OpenAI API with the Railway-hosted prompt
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
                            content: process.env.UX_PROMPT // The comprehensive prompt stored in Railway
                        },
                        {
                            role: 'user',
                            content: `Design Analysis Request:

Context: ${req.body.context || 'Comprehensive UX analysis'}
Design Type: ${req.body.contextAnalysis?.designType || 'interface'}
Complexity: ${req.body.contextAnalysis?.complexity || 'unknown'}
User Context: ${req.body.contextAnalysis?.userContext || ''}
Ignore Repeated Text: ${req.body.contextAnalysis?.ignoreRepeatedText || false}

Design Data: ${JSON.stringify(req.body.frames)}`
                        }
                    ]
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!openaiResponse.ok) {
                const errorText = await openaiResponse.text();
                console.error('OpenAI API Error:', openaiResponse.status, errorText);
                
                // Return appropriate error based on status
                if (openaiResponse.status === 429) {
                    return res.status(429).json({
                        error: 'OpenAI rate limit exceeded. Please try again in a few minutes.',
                        timestamp: new Date().toISOString()
                    });
                } else if (openaiResponse.status >= 500) {
                    return res.status(500).json({
                        error: 'OpenAI service temporarily unavailable',
                        timestamp: new Date().toISOString()
                    });
                } else if (openaiResponse.status === 401) {
                    return res.status(500).json({
                        error: 'API configuration error',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
                }
            }

            const result = await openaiResponse.json();
            const processingTime = Date.now() - startTime;

            console.log('Analysis completed:', {
                processingTime: `${processingTime}ms`,
                responseLength: result.choices[0]?.message?.content?.length || 0,
                tokensUsed: result.usage?.total_tokens || 0
            });

            res.json({
                content: result.choices[0]?.message?.content || '[]',
                processingTime,
                timestamp: new Date().toISOString(),
                tokensUsed: result.usage?.total_tokens || 0
            });

        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                return res.status(408).json({
                    error: 'Analysis timeout - design analysis took too long. This can happen with very complex designs.',
                    timestamp: new Date().toISOString()
                });
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('Proxy error:', error);
        const processingTime = Date.now() - startTime;
        
        let statusCode = 500;
        let errorMessage = 'Analysis failed: ' + error.message;

        // Handle specific error types
        if (error.message.includes('fetch')) {
            statusCode = 503;
            errorMessage = 'Unable to connect to OpenAI service';
        }
        
        res.status(statusCode).json({
            error: errorMessage,
            processingTime,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Critique Assistant Proxy running on Railway port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'production');
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    console.log('UX Prompt configured:', !!process.env.UX_PROMPT);
});
