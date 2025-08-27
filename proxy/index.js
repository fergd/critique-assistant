import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS properly for Figma
app.use(cors({
  origin: ['https://www.figma.com', 'https://figma.com'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Critique Assistant Proxy Running', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/proxy', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('Request received:', {
      timestamp: new Date().toISOString(),
      bodySize: JSON.stringify(req.body).length
    });

    // Prepare request to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.1,
        system: `${process.env.UX_PROMPT}`, // Your full detailed prompt
        messages: [{
          role: 'user',
          content: `Design Analysis Request:
          
Context: ${req.body.context || 'General UX analysis'}
Design Data: ${JSON.stringify(req.body.design)}
Focus Areas: ${req.body.contextAnalysis ? JSON.stringify(req.body.contextAnalysis) : 'General usability'}`
        }]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const result = await claudeResponse.json();
    const processingTime = Date.now() - startTime;
    
    console.log('Analysis completed:', {
      processingTime: `${processingTime}ms`,
      responseLength: result.content?.[0]?.text?.length || 0
    });

    res.json({
      content: result.content[0]?.text || '[]',
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
