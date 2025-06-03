# Critique Assistant – Figma Plugin for AI UX Audits

**Critique Assistant** is a Figma plugin that uses OpenAI's Assistants API to analyze UI designs for usability issues. It leverages a custom-trained assistant, heuristic best practices, a UX "trap" library, and optionally, a PRD to identify areas for improvement in a selected frame or frames.

---

## 🚀 Features

- ⚡ One-click AI-powered UX critiques
- 🧠 Evaluates designs using:
  - Custom UX traps (with severity, tenet, and examples)
  - Heuristic categories (e.g., Consistency, Feedback)
  - Attached PRD context (optional)
  - Homebase Design System guidelines (from attached `.txt` files)
- 🔍 Visual Reveal: Click to highlight the offending element in Figma
- 📊 Results grouped by severity with summary
- 🌀 Spinner + progress status updates while analyzing
- 📋 "No issues found" feedback when design passes review

---

## 📁 Project Structure

```

/critique-assistant/
├── code.js             # Plugin logic (Figma → HTML postMessages)
├── ui.html             # Plugin UI + full logic for interacting with OpenAI
├── manifest.json       # Figma plugin manifest
├── homebase\_text.txt   # Text reference from the design system (attached in vector store)
├── image.txt           # Visual descriptions or layout conventions (attached in vector store)
└── README.md           # This file

````

---

## 🧪 Usage

1. **Install the plugin locally** via Figma’s development mode:
   - Go to **Plugins → Development → New Plugin...**
   - Select this folder’s `manifest.json`

2. **Select one or more frames** in Figma

3. **Optionally** paste in your PRD (Product Requirements Document)

4. Click **Start critique**

---

## 🔐 Configuration

- Set your **OpenAI API key** and **assistant ID** in `ui.html`:

```js
const assistant_id = "asst_...";
const apiKey = "sk-proj-...";
````

* Ensure you’ve attached `homebase_text.txt` and `image.txt` in the Assistant's vector store
* The Assistant must be configured with:

  * **Response format:** `json_object`
  * **Files:** The two reference `.txt` files
  * **Custom prompt:** See below

---

## 🧠 Assistant Prompt Template

Your Assistant prompt should include:

* JSON output format only (no Markdown, no summaries)
* Use trap list (`enabled: true`) + heuristics
* Ignore hidden nodes
* Consider PRD context if supplied
* Reference the Homebase Design System from the provided files

*A full prompt example is stored in your Assistant editor.*

---

## 🧩 Dependencies

* OpenAI Assistants API v2 (`"OpenAI-Beta": "assistants=v2"`)
* Figma Plugin API
* Google Fonts – Plus Jakarta Sans

### Update `manifest.json`:

```json
"networkAccess": {
  "allowedDomains": [
    "https://api.openai.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com"
  ]
}
```

---

## 💬 Development Notes

* All UI and API logic is contained in `ui.html`
* Plugin uses `postMessage` from Figma → iframe to transfer design data
* Spinner and dynamic phase switching handled via `<section>` containers:

  * `before-container`
  * `analyzing-container`
  * `results-container`
* Modular JavaScript updates the interface live

---

## 🛠️ Future Enhancements

* 💡 Export UX reports (PDF or Markdown)
* 🎨 Custom theming per org/team
* 🧪 Frame-by-frame comparison mode
* 🤖 Assistant fine-tuning using real-world critiques

---

## 📄 License

MIT License © \[Your Name or Org]

```

Let me know if you'd like to insert images, badges, or any contribution guidelines!
```
