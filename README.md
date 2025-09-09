# Critique Assistant

[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-orange)](https://www.figma.com/community/plugin/1525540792303464974)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/yourusername/critique-assistant)

**AI-powered UX analysis for Figma designs**

Critique Assistant is a Figma plugin that leverages OpenAI's GPT-4 to analyze UI designs for usability issues using proven UX principles, heuristics, and a comprehensive "trap" library based on design best practices.

## ✨ Features

- 🧠 **AI-Powered Analysis** - Uses GPT-4 to identify UX issues automatically
- 🎯 **Focus & Highlight** - Click to navigate and highlight problematic elements in Figma
- 📊 **UX Trap Detection** - Evaluates against 24+ proven usability traps
- 🏷️ **Severity Classification** - Issues categorized as Critical, Important, or Minor
- 🔍 **Context-Aware** - Add custom context to focus analysis on specific areas
- ⚡ **One-Click Analysis** - Simple workflow: select frames → analyze → fix
- 🎨 **Beautiful UI** - Professional interface with smooth animations

## 🚀 Getting Started

### Installation

1. **Install from Figma Community** (Recommended)
   - Search for "Critique Assistant" in Figma's plugin library
   - Click "Install" to add it to your workspace

2. **Development Installation**
   ```bash
   git clone https://github.com/yourusername/critique-assistant.git
   cd critique-assistant
   ```
   - In Figma: `Plugins → Development → New Plugin...`
   - Select the `manifest.json` file

### Setup

1. **Configure API Keys** (for self-hosting only)
   - Set your OpenAI API key in your deployment environment
   - Configure the UX analysis prompt (see `index.js`)

2. **Deploy Proxy Server** (optional - for custom deployment)
   ```bash
   npm install
   npm start
   ```

## 🛠️ Usage

### Basic Workflow

1. **Select Frames** - Choose one or more frames/components to analyze
2. **Add Context** (Optional) - Describe what to focus on or specific concerns
3. **Configure Options** - Toggle "Ignore repeated text" if needed
4. **Start Analysis** - Click the analyze button and wait for results
5. **Review Issues** - Browse identified problems with severity ratings
6. **Focus Elements** - Click the crosshair icon to highlight issues in Figma

### Advanced Options

- **Context Input**: Guide the AI to focus on specific aspects:
  ```
  "Focus on mobile usability and accessibility"
  "Analyze the checkout flow for conversion issues"
  "Check for consistency with our design system"
  ```

- **Ignore Repeated Text**: Useful for designs with repetitive content like lists or grids

## 🔧 Technical Architecture

### Core Components

```
├── code.js          # Figma plugin logic & design serialization
├── ui.html          # Plugin interface & user interactions  
├── index.js         # Node.js proxy server for API requests
├── manifest.json    # Figma plugin configuration
└── tenets_and_traps.json  # UX principles database
```

### UX Analysis Framework

The plugin evaluates designs against **9 core tenets** and **24+ specific traps**:

**Tenets**: Understandable, Habituating, Comfortable, Responsive, Efficient, Forgiving, Discreet, Protective, Beautiful

**Example Traps**:
- Memory Challenge
- Invisible Elements  
- Inconsistent Appearance
- Accidental Activation
- System Amnesia
- And 19+ more...

### API Integration

```javascript
// Design data is serialized and sent to OpenAI GPT-4
const analysis = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [
    { role: 'system', content: UX_ANALYSIS_PROMPT },
    { role: 'user', content: serializedDesignData }
  ]
});
```

## 🏗️ Development

### Prerequisites

- Node.js 18+
- Figma account with plugin development access
- OpenAI API key (for custom deployment)

### Local Development

1. **Clone & Install**
   ```bash
   git clone https://github.com/yourusername/critique-assistant.git
   cd critique-assistant
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Create .env file
   OPENAI_API_KEY=your_openai_api_key_here
   UX_PROMPT="Your custom analysis prompt..."
   PORT=3000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Load Plugin in Figma**
   - Open Figma Desktop
   - `Plugins → Development → New Plugin...`
   - Select `manifest.json`

### Project Structure

```
critique-assistant/
├── code.js                 # Main plugin logic
├── ui.html                 # Plugin interface  
├── index.js                # Proxy server
├── package.json            # Dependencies
├── railway.json            # Railway deployment config
├── tenets_and_traps.json   # UX knowledge base
├── manifest.json           # Figma plugin manifest
└── README.md               # This file
```

### Key Functions

```javascript
// Serialize Figma nodes for AI analysis
function serializeNodeForAI(node, depth)

// Validate payload size to prevent API overload  
function validatePayloadSize(payload)

// Match violations to specific design elements
function findBestMatchingNode(violationContext)
```

## 🚀 Deployment

### Railway (Recommended)

1. **Connect Repository**
   - Link your GitHub repo to Railway
   - Set environment variables in Railway dashboard

2. **Deploy**
   ```bash
   # Railway will automatically deploy on push
   git push origin main
   ```

### Alternative Platforms

- **Vercel**: Serverless deployment with edge functions
- **Heroku**: Traditional hosting with dyno-based scaling  
- **AWS/GCP**: Custom containerized deployment

### Environment Variables

```bash
OPENAI_API_KEY=sk-proj-...        # Your OpenAI API key
UX_PROMPT="Custom prompt..."      # Analysis instructions
PORT=3000                         # Server port (optional)
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Plugin loads without errors
- [ ] Frame selection works correctly
- [ ] Analysis completes successfully
- [ ] Results display properly
- [ ] Focus feature highlights elements
- [ ] Error handling works for edge cases

### Edge Cases to Test

- **Large Designs**: 500+ elements (should show size warning)
- **Complex Nesting**: Deep component hierarchies  
- **Network Issues**: Offline/timeout scenarios
- **Invalid Selections**: Empty frames, hidden elements
- **API Limits**: Rate limiting and quota exceeded

### Performance Testing

```bash
# Monitor memory usage during analysis
node --inspect index.js

# Test with various design complexities
# Small: <50 elements
# Medium: 50-200 elements  
# Large: 200+ elements (should be limited)
```

## 📚 API Reference

### Plugin Messages

```javascript
// Request analysis
{
  type: 'analyze-frames',
  context: 'User-provided context',
  ignoreRepeatedText: boolean
}

// Focus on violation
{
  type: 'focus-violation-area-optimized',
  violationContext: violationData
}
```

### Analysis Response Format

```javascript
{
  "title": "Issue Title",
  "description": "Detailed description", 
  "severity": "critical|important|minor",
  "principleViolation": "Tenet: Trap description",
  "userImpact": "How this affects users",
  "recommendation": "Suggested fix",
  "location": "Design hierarchy path"
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)  
5. **Open** a Pull Request

### Code Style

- Use ES6+ features where supported
- Follow existing code formatting
- Add comments for complex logic
- Test edge cases thoroughly

## 🐛 Troubleshooting

### Common Issues

**Plugin won't load:**
- Check `manifest.json` syntax
- Verify all files are in the correct directory
- Review browser console for errors

**Analysis fails:**
- Check network connection
- Verify API key configuration
- Try with simpler/smaller designs
- Check server logs for detailed errors

**Focus feature doesn't work:**
- Ensure elements have descriptive names
- Check for deeply nested components
- Try selecting parent frames instead

**Memory issues:**
- Limit analysis to 3-5 frames max
- Avoid extremely complex designs
- Restart plugin if performance degrades

### Error Codes

- `PAYLOAD_TOO_LARGE`: Design too complex, select fewer elements
- `RATE_LIMITED`: API quota exceeded, wait before retrying
- `SERVER_TIMEOUT`: Analysis took too long, try simpler design
- `NETWORK_ERROR`: Connection issue, check internet

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT-4 API
- [Figma](https://figma.com) for the plugin platform  
- UX research community for usability principles
- Contributors and beta testers

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/yourusername/critique-assistant/issues)
- **Documentation**: [Wiki pages](https://github.com/yourusername/critique-assistant/wiki)
- **Community**: [Discussions](https://github.com/yourusername/critique-assistant/discussions)
- **Email**: support@your-domain.com

---

**Made with ❤️ for the design community**

[⬆ Back to top](#critique-assistant)
