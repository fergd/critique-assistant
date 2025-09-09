# Railway Deployment Guide for Critique Assistant

## ✅ Current Railway Setup

Your app is correctly configured for Railway deployment with support for complex designs.

### 🚀 Railway Configuration

**Service URL**: `https://critique-assistant-production.up.railway.app`

**Environment Variables Required**:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
UX_PROMPT=your-comprehensive-ux-analysis-prompt
NODE_ENV=production
```

### 📝 Railway Environment Setup

1. **Go to Railway Dashboard**
   - Navigate to your `critique-assistant-production` service
   - Click on "Variables" tab

2. **Set Required Variables**:

   **OPENAI_API_KEY**:
   ```
   sk-proj-your-openai-api-key-here
   ```

   **UX_PROMPT**: (Your comprehensive UX analysis prompt)
   ```
   You are an expert UX analyst trained in usability heuristics and design principles. 

   Analyze the provided Figma design data and identify usability issues based on:
   
   1. Jakob Nielsen's 10 Usability Heuristics
   2. The 9 UX Tenets (Understandable, Habituating, Comfortable, Responsive, Efficient, Forgiving, Discreet, Protective, Beautiful)
   3. The 24 UX Traps (Memory Challenge, Forced Syntax, Inviting Dead End, etc.)
   
   CRITICAL: Return ONLY valid JSON array format. No markdown, no explanations, just JSON.
   
   For each issue found, return this exact structure:
   {
     "title": "Brief issue title",
     "description": "Detailed description of the problem",
     "severity": "critical|important|minor", 
     "principleViolation": "Tenet: Trap - Description",
     "userImpact": "How this affects users",
     "recommendation": "Specific fix suggestions",
     "location": "Design hierarchy path if identifiable"
   }
   
   If no issues found, return: []
   
   Focus on: accessibility, consistency, usability patterns, information architecture, and user flow issues.
   ```

   **NODE_ENV**:
   ```
   production
   ```

### 🔧 Key Railway Optimizations

**For Complex Designs**:
- ✅ **50MB payload limit** (increased from 10MB)
- ✅ **2-minute timeout** (extended for complex analysis)
- ✅ **Comprehensive error handling** for large designs
- ✅ **Better logging** with frame counts and processing times
- ✅ **Health check endpoint** at `/health`

### 🎯 How It Works with Complex Designs

1. **Plugin serializes** up to 8 frames (increased from 5)
2. **Railway receives** large design payload (up to 50MB)
3. **Stored UX prompt** provides comprehensive analysis instructions
4. **Extended timeout** allows for thorough complex design analysis
5. **Results returned** with full UX violation details

### 📊 Monitoring Your Railway Deployment

**Health Check**: 
```bash
curl https://critique-assistant-production.up.railway.app/health
```

**Main Status**:
```bash
curl https://critique-assistant-production.up.railway.app/
```

**Expected Response**:
```json
{
  "status": "Critique Assistant Proxy Running on Railway",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 🚨 Railway Logs to Monitor

In Railway dashboard → your service → "Logs":

```
✅ Critique Assistant Proxy running on Railway port 3000
✅ Environment: production  
✅ OpenAI API Key configured: true
✅ UX Prompt configured: true
```

**During Analysis**:
```
Request received: { framesCount: 6, bodySize: 2567890 }
Analysis completed: { processingTime: '45000ms', tokensUsed: 3200 }
```

### 🔄 Deployment Updates

When you update your code:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Updated for complex design support"
   git push origin main
   ```

2. **Railway auto-deploys** from your connected GitHub repo

3. **Verify deployment** via health check endpoint

### 💡 Railway Benefits for Complex Designs

- **No cold starts** - Always warm for faster analysis
- **Automatic scaling** - Handles multiple concurrent analyses  
- **Large payload support** - Can process complex design files
- **Comprehensive logging** - Easy debugging of analysis issues
- **Environment variable storage** - Secure API key and prompt storage
- **Custom domain support** - Professional deployment URL

### 🆘 Troubleshooting Railway Issues

**Service won't start**:
- Check environment variables are set correctly
- Verify `package.json` has correct start script
- Review Railway logs for startup errors

**Analysis timing out**:
- Check OpenAI API key is valid and has credits
- Verify UX_PROMPT environment variable is set
- Monitor Railway logs during analysis

**CORS issues**:
- Ensure Figma domains are whitelisted in CORS config
- Check Railway deployment URL is accessible from Figma

**Memory issues**:
- Railway provides sufficient memory for complex designs
- Monitor usage in Railway dashboard
- Consider breaking extremely large designs into sections

---

## ✅ Status: Ready for Complex Design Analysis

Your Railway deployment is optimized for handling complex Figma designs with comprehensive UX analysis!
