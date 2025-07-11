
# Critique Assistant – Figma Plugin for AI UX Audits

**Critique Assistant** is a Figma plugin that uses OpenAI's Assistants API to analyze UI designs for usability issues. It leverages a custom-trained assistant, heuristic best practices, a UX "trap" library, and optionally, PRD/contextual notes to identify areas for improvement in a selected frame or group.

---

## Features

- ⚡ One-click AI-powered UX critiques
- 🧠 Evaluates designs using:
  - Custom UX traps (with severity, tenet, and examples)
  - Heuristic categories (e.g., Consistency, Feedback)
  - Optional PRD or design context
  - Homebase Design System guidelines
- 🔍 Visual Reveal: Click to highlight the offending element in Figma
- 📋 Deduplication toggle to suppress repeat text critiques
- 📊 Results grouped by trap name and impact
- 🌀 Spinner + progress phase indicators while analyzing
- 👍👎 Feedback buttons and external link to rate accuracy
- ↻ "Critique Again" reuses current selection instantly
- 🧼 "Reset" clears form without re-running

---

## Project Structure

```
/critique-assistant/                # Figma plugin UI + logic
├── code.js                         # Plugin logic (Figma → postMessage, highlight, selection)
├── ui.html                         # Plugin UI, interactions, fetch to proxy
├── manifest.json                   # Figma plugin manifest
├── tenets_and_traps.json           # UX trap definitions (excluded from Git)
├── .gitignore                      # Excludes reference .txt files
└── README.md                       # This file
```

---

## Usage

1. **Install the plugin locally** via Figma’s development mode:
   - Go to **Plugins → Development → Import plugin from manifest...**
   - Select the root folder’s `manifest.json`

2. **Select one or more frames, groups, or sections**

3. (Optional) **Add design context or PRD**

4. Toggle **"Ignore repeated text"** to suppress name duplication issues

5. Click **Start critique**

6. Use **"Show me"** buttons to jump to each problem

7. Submit feedback via the **Google Form link** if desired

---

## Configuration

Ensure your Figma manifest `networkAccess` includes your deployed proxy:

```json
"networkAccess": {
  "allowedDomains": [
    "https://api.openai.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://your-vercel-proxy-url.vercel.app"
  ]
}
```

---

## Recommended `.gitignore`

```gitignore
# Do not commit sensitive/reference files
homebase_text.txt
image.txt
*.api.key
.env.local
.vercel/
```

---

## License

MIT License © Homebase
