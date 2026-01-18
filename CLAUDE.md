# ActionablePlus Chat - E-Commerce Consultant App

## Project Overview

E-commerce consulting app with specialized AI agents (based on LibreChat).

**Current Date:** {{current_date}}

## Tech Stack

- **Base:** https://github.com/kolbertistvan2/actionableplus (LibreChat fork)
- **AI Providers:**
  - Anthropic Claude (primary)
  - Google Gemini
  - OpenAI
- **Deployment:** Railway (production: https://app.actionableplus.com)
- **Local Dev:** Docker Desktop

## Latest AI Models (Dec 2025)

### Anthropic
- `claude-opus-4-5-20251101` - Most capable
- `claude-sonnet-4-5-20250929` - Balanced
- `claude-haiku-4-5-20251001` - Fast
- See: https://docs.anthropic.com/en/docs/about-claude/models

### Google Gemini
- `gemini-3-pro-preview` - Best multimodal, most powerful agentic model
- `gemini-3-flash-preview` - Advanced reasoning + fast performance
- `gemini-2.5-flash` - Best price-performance, large-scale processing
- `gemini-2.5-pro` - State-of-the-art thinking model (code, math, STEM)
- See: https://ai.google.dev/gemini-api/docs/models

### OpenAI
- `gpt-5.2` - Latest, most capable
- `gpt-5.1` - Previous generation flagship
- `gpt-5` / `gpt-5-mini` / `gpt-5-nano` - GPT-5 family
- `o4-mini` - Latest reasoning model (small)
- `o3` - Reasoning model
- `o1` / `o1-mini` - Previous reasoning models
- See: https://platform.openai.com/docs/models

## Development Workflow

```
1. Fork (GitHub) → 2. Local dev (Docker optional) → 3. Git commit & push → 4. Railway auto-deploys
```

**Railway auto-deploy:** Push to `main` branch triggers automatic build & deploy on Railway.
No local Docker needed for deployment - Railway builds from Dockerfile.

**GitHub repo:** https://github.com/kolbertistvan2/actionableplus

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables, API keys |
| `librechat.yaml` | Main configuration (optional) |
| `docker-compose.yml` | Local Docker setup |
| `docker-compose.override.yml` | Local customizations |
| `client/vite.config.ts` | PWA manifest (app name, icons) |

## Current Status

- **Working:** Default LibreChat with all providers (Anthropic, Google, OpenAI)
- **Customized:** UI translations (EN/HU) - "Consultants" branding
- **Completed:** MCP browser automation with Browserbase/Stagehand
- **Completed:** Manus-style browser preview UI (BrowserThumbnail + BrowserSidePanel)

## Commands

```bash
# Start local development
docker-compose up -d

# View logs
docker-compose logs -f LibreChat

# Stop
docker-compose down

# Full restart (if issues)
docker-compose down && docker-compose up -d
```

## URLs

- **Local:** http://localhost:3080
- **Production:** https://app.actionableplus.com

## Railway Deployment

### Required Environment Variables

```bash
# Core
MONGO_URI=mongodb://...@mongodb.railway.internal:27017
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
CREDS_KEY=<generated>
CREDS_IV=<generated>

# API Keys
ANTHROPIC_API_KEY=<key>
GOOGLE_KEY=<key>
OPENAI_API_KEY=<key>

# Models
ENDPOINTS=agents,google,anthropic,openAI
ANTHROPIC_MODELS=claude-opus-4-5-20251101,claude-sonnet-4-5-20250929,...
GOOGLE_MODELS=gemini-3-pro-preview,gemini-3-flash-preview,...
OPENAI_MODELS=gpt-5.2,gpt-5.1,gpt-5,...

# MCP
MCP_INIT_TIMEOUT_MS=120000

# App
APP_TITLE=Actionable+
DOMAIN_CLIENT=https://app.actionableplus.com
DOMAIN_SERVER=https://app.actionableplus.com
```

### Important: .dockerignore

A `.dockerignore` fájl `librechat*` mintája kizárja a config fájlokat. Kivétel hozzáadva:
```
librechat*
!librechat.yaml
```

**Tanulság:** Ha a Railway logban "no such file or directory, open '/app/librechat.yaml'" hiba van, ellenőrizd a `.dockerignore`-t!

### Railway Files

| File | Purpose |
|------|---------|
| `railway.toml` | Railway build config (Dockerfile builder) |
| `librechat.yaml` | MCP servers, model specs (MUST be in Docker image) |
| `.dockerignore` | Exclude patterns (with `!librechat.yaml` exception) |

### MCP on Railway

Az MCP toolok megjelenéséhez az Agent Builder-ben:
1. `librechat.yaml` commitolva kell legyen (mcpServers section)
2. `.dockerignore` NE zárja ki a `librechat.yaml`-t
3. `MCP_INIT_TIMEOUT_MS=120000` Railway Variables-ban
4. Deploy után ellenőrizd a logokat: "Initializing MCP servers"
5. Ha sikerült, az Agent Builder-ben megjelennek a toolok

## Notes

- First registered user becomes admin
- Works without librechat.yaml (uses defaults)
- API keys configured in .env file
- MCP integration requires librechat.yaml with mcpServers section

## Docker Volume Mounts

A `docker-compose.override.yml` fájlban a `client/public/assets` mappa be van kötve a containerbe:

```yaml
volumes:
  - type: bind
    source: ./client/public/assets
    target: /app/client/public/assets
    read_only: true
```

Ez lehetővé teszi, hogy a lokális assets fájlok (logo, favicon, stb.) azonnal érvénybe lépjenek rebuild nélkül. Csak `docker-compose up -d api` újraindítás kell a változások után.

## MCP Browser Automation (Completed)

Browser automation is fully integrated with Stagehand MCP:

- **BrowserThumbnail:** Compact preview card above chat input showing live browser session
- **BrowserSidePanel:** Full browser view beside chat (480px width)
- **URL Tracking:** Shows actual browsed URL (from navigate tool), not browserbase debug URL
- **Live Preview:** Scaled iframe showing browser content

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| BrowserThumbnail | `client/src/components/BrowserPreview/BrowserThumbnail.tsx` | Compact preview card |
| BrowserSidePanel | `client/src/components/BrowserPreview/BrowserSidePanel.tsx` | Full browser panel |
| currentBrowsedUrlFamily | `client/src/store/browserSession.ts` | Recoil state for URL |
| ToolCall (navigate) | `client/src/components/Chat/Messages/Content/ToolCall.tsx` | Extracts URL from navigate args |

### Browser Preview UX (Dec 2025)

- **BrowserToggleButton:** Globe icon in chat input, always visible when browser session exists
- **Pulsing green indicator:** Shows when browser is actively working
- **Auto-dismiss:** Thumbnail hides 5 seconds after browsing completes
- **X button:** Manual dismiss on hover

### Browser Session Isolation (Jan 2026)

Browser sessions are fully isolated per conversation on multi-user platforms.

#### Frontend: Recoil State Isolation

Recoil atomFamily with `conversationId` keys ensures UI state is per-conversation.

**Key files using consistent `browserConversationId` logic:**

| File | Purpose |
|------|---------|
| `ChatForm.tsx` | Browser thumbnail, toggle button |
| `SidePanelGroup.tsx` | Browser side panel |
| `ToolCall.tsx` | Sets UIResource when browser tool runs |

**Recoil state keys:**
```typescript
activeUIResourceFamily(conversationId)      // Browser resource per chat
browserSidePanelOpenFamily(conversationId)  // Panel open state per chat
browserThumbnailDismissedFamily(conversationId) // Thumbnail dismissed per chat
currentBrowsedUrlFamily(conversationId)     // Current URL per chat
```

#### Backend: MCP Connection Isolation

MCP connections are reconnected when switching conversations to ensure fresh browser sessions.

**Key files:**

| File | Change |
|------|--------|
| `packages/api/src/mcp/connection.ts` | `sessionConversationId` tracking, `needsReconnectForConversation()` |
| `packages/api/src/mcp/MCPManager.ts` | Force reconnect when conversationId changes |

**Flow:**
```
Chat A: browser tool → MCP session created, sessionConversationId = "chat-A"
Chat B: browser tool → needsReconnectForConversation("chat-B") = true
                     → disconnect → new MCP session, sessionConversationId = "chat-B"
```

#### Browserbase: Fresh Sessions

**IMPORTANT:** Do NOT set `BROWSERBASE_CONTEXT_ID` on Railway stagehand-mcp-server!

- With `BROWSERBASE_CONTEXT_ID`: All sessions share cookies/localStorage (BAD for multi-user)
- Without `BROWSERBASE_CONTEXT_ID`: Each MCP session gets fresh browser (GOOD)

#### Agent Behavior: Explain Before Execute

Global instructions injected for all MCP tool agents ensure text response before tool calls.

**File:** `api/server/controllers/agents/client.js` - `browserAgentInstructions` constant

This helps because:
1. User gets immediate feedback
2. Conversation gets an ID before browser tool runs
3. Browser session isolation works correctly

### librechat.yaml MCP Config

```yaml
mcpServers:
  kolbert-ai-browser:  # Renamed from browserbase
    type: streamable-http
    url: https://stagehand-mcp-server-production.up.railway.app/mcp
    timeout: 600000
    title: "Kolbert AI Browser"
  gemini-image:
    type: streamable-http
    url: https://gemini-image-mcp-production.up.railway.app/mcp
    timeout: 120000
  claude-skills:
    type: streamable-http
    url: https://skills-mcp-server-production.up.railway.app/mcp
    timeout: 300000
    title: "Claude Skills"
    description: "Excel, PowerPoint, Word, PDF, Frontend Design, and more"

endpoints:
  agents:
    recursionLimit: 50      # Default: 25
    maxRecursionLimit: 100  # Max allowed
```

### Stagehand MCP Server Config

**Model:** `google/gemini-3-flash-preview`

**System Prompt:** Custom prompt instructs AI to always click search buttons explicitly (not Enter key) for reliable form submission.

**Config file:** `/Users/kolbert/Dev/stagehand-mcp-server/src/config.ts`

## Document Reading Support (Jan 2026)

Agents can read uploaded document files (Word, Excel, PDF, txt, md, csv, json) and access their contents directly.

### How It Works

1. User uploads a document file in chat
2. `addFileContextToMessage()` in `api/server/controllers/agents/client.js` extracts the text content
3. Content is added to `message.fileContext` which becomes part of the system prompt
4. Agent can read and analyze the document content

### Supported File Types

| Type | Library | Extensions |
|------|---------|------------|
| Excel | xlsx | .xlsx, .xls |
| Word | mammoth | .docx |
| PDF | pdf-parse | .pdf |
| Text | fs (native) | .txt, .md, .csv, .json |

### Key Implementation

**File:** `api/server/controllers/agents/client.js`

```javascript
// parseDocumentContent() helper function (line 67-129)
// Extracts text from documents using appropriate library

// In addFileContextToMessage() (line 410-441)
// Filters non-image attachments and parses their content
const documentAttachments = attachments.filter(
  (f) => !f.type?.startsWith('image/') && !f.type?.startsWith('video/') && !f.type?.startsWith('audio/')
);
```

### Content Limits

- Max 50,000 characters per file (truncated with `... [content truncated]` message)
- This prevents token overflow for large documents

### Format Passed to Agent

```
Uploaded document contents:
=== Document: report.xlsx ===
=== Sheet: Sheet1 ===
Name,Value,Date
Item1,100,2026-01-01
...

=== Document: contract.docx ===
Full text content of the Word document...
```

## Office Document Vision Support (Jan 2026)

Agents can now "see" charts, diagrams, and visual elements in Office documents (Excel, Word, PowerPoint) by automatically converting them to PDF for Claude's native vision support.

### How It Works

1. User uploads Excel/Word/PowerPoint file
2. `addDocuments()` override in agent client detects Office files
3. LibreOffice headless converts Office → PDF (preserves charts/formatting)
4. PDF is sent to Claude API using native document vision
5. Agent receives BOTH text extraction (CSV/text) AND visual representation

### Architecture

```
Excel/Word/PPT Upload
    ├─→ parseDocumentContent() → Text/CSV extraction → fileContext
    └─→ convertOfficeToPdf() → PDF → Claude native vision (charts visible!)
```

### Key Files

| File | Purpose |
|------|---------|
| `Dockerfile` | LibreOffice packages (libreoffice-calc, writer, impress) |
| `api/server/services/Files/documents/officeToPdf.js` | Office→PDF converter |
| `api/server/controllers/agents/client.js` | `addDocuments()` override |

### Supported Office Formats

| Format | Extension | Vision Support |
|--------|-----------|----------------|
| Excel | .xlsx, .xls | ✅ Charts visible |
| Word | .docx, .doc | ✅ Formatting visible |
| PowerPoint | .pptx, .ppt | ✅ Slides visible |
| PDF | .pdf | ✅ Native (already worked) |

### Dockerfile Dependencies

```dockerfile
# Added for Office→PDF conversion
RUN apk add --no-cache libreoffice-calc libreoffice-writer libreoffice-impress
```

### Token Cost

- Same as direct PDF upload (~1,000 tokens per page)
- 10-sheet Excel ≈ $0.03
- Agent sees both data (text) and visuals (charts)

## Gemini Image Generation & Editing (Completed)

Image generation and editing is implemented via a custom MCP server.

### Why MCP Server?

The LangChain JS package (`@langchain/google-genai` v0.2.18) does NOT support the `responseModalities` parameter needed for Gemini image generation. The Python package supports it, but JS doesn't yet. See: [GitHub Issue #9682](https://github.com/langchain-ai/langchainjs/issues/9682)

**Solution:** Custom MCP server that uses `@google/genai` SDK directly, bypassing LangChain.

### Available Tools

| Tool | Purpose |
|------|---------|
| `generate_image` | Generate images from text prompts |
| `edit_image` | Edit/enhance uploaded images with AI instructions |
| `analyze_image` | Analyze images and return text description |

### Architecture

```
Agent (gemini-3-pro-preview)
    ↓ calls generate_image / edit_image / analyze_image
gemini-image-mcp server (Railway US East)
    ↓ uses @google/genai SDK
Google Gemini API (gemini-3-pro-image-preview)
    ↓ returns base64 image or text analysis
Agent displays result in chat
```

### Image Editing Flow

When user uploads an image:
1. Image stored at `/images/{userId}/{fileId}.png`
2. `fileContext` injection adds public URL to agent context
3. Agent calls `edit_image` with `https://app.actionableplus.com/images/...` URL
4. MCP server downloads image, converts to base64, sends to Gemini
5. Gemini returns edited image

**Key file:** `api/server/controllers/agents/client.js` - `addFileContextToMessage()` override

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| gemini-image-mcp | https://github.com/kolbertistvan2/gemini-image-mcp | MCP server repo |
| Railway Service | US East region (required for Gemini image gen) | Hosting |
| fileContext injection | `api/server/controllers/agents/client.js` | Passes uploaded image URLs to agent |

### Agent Configuration

**IMPORTANT:** In Agent Builder, you must manually enable (checkbox) each MCP tool the agent should use:
- `generate_image` - for creating new images
- `edit_image` - for editing uploaded images
- `analyze_image` - for analyzing uploaded images

The agent won't use tools that aren't checked, even if the MCP server provides them.

### Important: Region Restriction

Gemini image generation is NOT available in all countries. The MCP server must run in **US region** (US East or US West on Railway) to avoid "Image generation is not available in your country" error.

### Environment Variables (Railway - gemini-image-mcp)

```
GOOGLE_KEY=<gemini-api-key>
```

### Generated Image Persistence (Jan 2026 Fix)

Generated images now persist correctly when reloading conversations.

**Problem solved:** MCP-generated images appeared during streaming but disappeared when reloading the chat.

**Root cause:** Images were saved to Files collection but not persisted to the Message's `files` field because the message was already saved during streaming (before image generation completed).

**Solution:** Added `updateMessage` call in `api/server/controllers/agents/request.js` to update the message with generated files after artifact promises resolve.

**Key code (lines 313-322 for resumable, 688-697 for legacy):**
```javascript
} else if (response.files && response.files.length > 0) {
  // Message was already saved during streaming, but we need to update it with generated files
  await updateMessage(
    req,
    { messageId, files: response.files },
    { context: 'api/server/controllers/agents/request.js - update generated files' },
  );
}
```

## Claude Skills MCP (Document Generation)

Custom MCP server that exposes Anthropic Claude Skills as tools for document generation (Excel, PowerPoint, Word, PDF, etc.).

### Repository

**Local:** `/Users/kolbert/Dev/skills-mcp-server`
**Railway:** https://skills-mcp-server-production.up.railway.app

### Architecture

```
Agent (LibreChat)
    ↓ calls create_excel / create_presentation / etc.
skills-mcp-server (Railway)
    ↓ uses Anthropic SDK with container.skills
Anthropic Claude Skills API (claude-sonnet-4-5-20250929)
    ↓ generates file (xlsx, pptx, docx, pdf)
Files API (/v1/files/{fileId}/content)
    ↓ downloads file
In-memory file store (24h TTL)
    ↓ download URL
Agent returns link to user
```

### Available Skills (16 total - ALL WORKING)

**Pre-built Anthropic Skills (type: "anthropic"):**

| Tool | Skill ID | Description |
|------|----------|-------------|
| `create_excel` | xlsx | Excel spreadsheets with formulas, charts, pivot tables |
| `create_presentation` | pptx | PowerPoint presentations with layouts, charts |
| `create_document` | docx | Word documents with headers, tables, styles |
| `create_pdf` | pdf | PDF documents and reports |

**Custom Skills (type: "custom" - uploaded via Skills API):**

| Tool | Skill ID | Description |
|------|----------|-------------|
| `create_algorithmic_art` | algorithmic-art | Generative art with p5.js, seeded randomness |
| `create_canvas_design` | canvas-design | Visual art in PNG/PDF using HTML Canvas |
| `create_frontend_design` | frontend-design | Production-grade UI design (HTML/CSS/JS) |
| `create_theme` | theme-factory | Design themes, color palettes, typography |
| `build_mcp_server` | mcp-builder | MCP server development |
| `create_skill` | skill-creator | Create new Claude Skills (SKILL.md) |
| `build_web_artifact` | web-artifacts-builder | Interactive web components |
| `test_webapp` | webapp-testing | Web app testing strategies |
| `create_brand_guidelines` | brand-guidelines | Anthropic brand colors/typography |
| `coauthor_document` | doc-coauthoring | Collaborative document editing |
| `create_internal_comms` | internal-comms | Company announcements, newsletters |
| `create_slack_gif` | slack-gif-creator | Animated GIFs for team communication |

### Two Types of Skills

**Pre-built (4 skills):** Use `type: "anthropic"` with skill_id like "xlsx", "pptx"

**Custom (12 skills):** Use `type: "custom"` with uploaded skill IDs. These were uploaded via the Skills API (`POST /v1/skills`) and have IDs like `skill_01J936vqmotEY1kyMPY7Udoo`.

### Custom Skill IDs Mapping

```typescript
// In src/index.ts - these are uploaded skill IDs
const CUSTOM_SKILL_IDS: Record<string, string> = {
  "algorithmic-art": "skill_014qWgeU9NNBxSMZd7eHNCet",
  "brand-guidelines": "skill_017AGJ1TcfDhMDi7SDHv9pRy",
  "canvas-design": "skill_01EtHSQDzwbeeHYAinhbVrfH",
  "doc-coauthoring": "skill_017Gppj6evBdWPgvBp2TzafE",
  "frontend-design": "skill_01J936vqmotEY1kyMPY7Udoo",
  "internal-comms": "skill_01FAK6w1ctsv7tFjNK4JxGHd",
  "mcp-builder": "skill_01WsnGNu9jKGGf4ho83w7xbi",
  "skill-creator": "skill_015iRzTEdCQ4B5iJjX5dH5ZH",
  "slack-gif-creator": "skill_01LpiivoMVr34qtNs2HVuxQc",
  "theme-factory": "skill_012v24TfcvLLMqEr31BhL6jg",
  "web-artifacts-builder": "skill_01CpghWzdRX6tzWYMu4RFhZD",
  "webapp-testing": "skill_01KipSdx7kZ2diHMn8gbLCor",
};
```

### Upload Script

To re-upload custom skills (if needed), use `/Users/kolbert/Dev/skills-mcp-server/upload-custom-skills.ts`:

```bash
cd /Users/kolbert/Dev/skills-mcp-server
ANTHROPIC_API_KEY=... npx tsx upload-custom-skills.ts
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main server - skill definitions (line 66-183), API calls |
| `package.json` | Dependencies (@anthropic-ai/sdk, @modelcontextprotocol/sdk) |
| `Dockerfile` | Alpine Node.js image for Railway |

### API Configuration

```typescript
// Beta features required
betas: ["code-execution-2025-08-25", "skills-2025-10-02", "files-api-2025-04-14"]

// For pre-built skills (xlsx, pptx, docx, pdf)
container: {
  skills: [{
    type: "anthropic",
    skill_id: "xlsx",  // e.g., "xlsx", "pptx"
    version: "latest",
  }]
}

// For custom skills (frontend-design, etc.)
container: {
  skills: [{
    type: "custom",
    skill_id: "skill_01J936vqmotEY1kyMPY7Udoo",  // Uploaded skill ID
    version: "latest",
  }]
}
```

### librechat.yaml Config

```yaml
claude-skills:
  type: streamable-http
  url: https://skills-mcp-server-production.up.railway.app/mcp
  timeout: 300000
  initTimeout: 30000
  requiresOAuth: false
  title: "Claude Skills"
  description: "Excel, PowerPoint, Word, PDF, Frontend Design, and more"
```

### Environment Variables (Railway - skills-mcp-server)

```
ANTHROPIC_API_KEY=<anthropic-api-key>
BASE_URL=https://skills-mcp-server-production.up.railway.app
```

## File Storage Configuration

### TTL (Time-To-Live)

Uploaded files have a **30 day TTL** by default. After 30 days, MongoDB automatically deletes the file record (physical file remains on disk).

**Configuration:** `api/models/File.js` line 74

```javascript
expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days TTL
```

**TTL is disabled when:**
- File is associated with a message (`updateFileUsage()` call)
- File is used in agent/assistant context
- File is created with `disableTTL: true` flag

### Storage Volumes

```yaml
# docker-compose.yml
volumes:
  - ./images:/app/client/public/images
  - ./uploads:/app/uploads
```

## Artifacts System

### Self-hosted Sandpack Bundler

A Sandpack bundler self-hosted változata fut a Dockerben, ami eliminálja a codesandbox.io CDN függőséget és megoldja a "Failed to fetch" hibákat.

**docker-compose.override.yml:**
```yaml
services:
  api:
    depends_on:
      - sandpack
    environment:
      - SANDPACK_BUNDLER_URL=http://sandpack:80

  sandpack:
    container_name: sandpack-bundler
    image: ghcr.io/librechat-ai/codesandbox-client/bundler:latest
    restart: always
    ports:
      - "3030:80"
```

**Előnyök:**
- Nincs CDN függőség (megbízható)
- Gyorsabb (helyi)
- Telemetria nélküli (LibreChat-AI fork)

**Docs:** https://github.com/LibreChat-AI/codesandbox-client

### Artifact CSS Fix

A `client/src/utils/artifacts.ts` fájlban lévő `/public/index.html` template tartalmaz CSS-t ami megakadályozza a chartok összecsúszását:
- Flex column layout a `#root`-on
- Min-height a recharts containereken
- Gap a komponensek között

### Chat Copy to Clipboard

A chat üzenet "Copy to clipboard" gombja kiszűri az artifact blokkokat, így csak a szöveges tartalom másolódik.

**Implementáció:** `client/src/hooks/Messages/useCopyToClipboard.ts`

```typescript
// Regex: :::artifact{...} ... ::: blokkok eltávolítása
text.replace(/:::artifact\{[^}]*\}[\s\S]*?\n:::\s*(?:\n|$)/g, '').trim()
```

### Artifact Export - Smart Hybrid (Jan 2026)

Az artifact export rendszer intelligensen exportálja a vizuális tartalmat (prezentációk, dashboardok) ahelyett, hogy nyers HTML kódot adna.

**Problem solved:** PPTX/PDF export showed raw HTML source code ("Kód" slide with `<!DOCTYPE html>`) instead of the visual content.

**Solution:** Smart Hybrid Export with 3 strategies:

1. **Built-in Export Detection** - Ha az artifact tartalmaz beépített export függvényt (pl. `downloadPDF()`), azt hívjuk meg Sandpack iframe-en keresztül → pixel-perfect export
2. **Presentation Type** - HTML prezentációkat felismeri és slide-onként exportálja PPTX-be
3. **Fallback** - Egyéb tartalom a meglévő logikával

**Key changes:**

| File | Change |
|------|--------|
| `ExportDropdown.tsx` | Built-in export detection (`downloadPDF`, `exportToPDF`, etc.), Sandpack iframe integration |
| `useArtifactExport.ts` | New `'presentation'` ContentType, `isPresentationContent()`, `extractSlidesFromHTML()` |
| `Artifacts.tsx` | Pass `previewRef` to ExportDropdown for iframe access |

**Built-in export patterns detected:**
```typescript
const BUILT_IN_EXPORT_PATTERNS = [
  /function\s+(downloadPDF|exportToPDF|exportPresentation)\s*\(/,
  /const\s+(downloadPDF|exportToPDF|exportPresentation)\s*=/,
  /(?:window\.)?(downloadPDF|exportToPDF)\s*=\s*(?:function|\()/,
];
```

**Presentation detection indicators:**
```typescript
const presentationIndicators = [
  /class="slide"/i,
  /class="presentation"/i,
  /page-break-after:\s*always/i,
  /downloadPDF|exportToPDF/i,
];
```

**Export quality by type:**

| Scenario | Method | Quality |
|----------|--------|---------|
| HTML with built-in export | Call `downloadPDF()` via iframe | ⭐⭐⭐⭐⭐ Pixel-perfect |
| HTML presentation (no built-in) | Slide extraction → PPTX | ⭐⭐⭐⭐ Editable |
| React dashboard | `parseReactDashboard()` | ⭐⭐⭐⭐ Data tables |
| Other code | "Kód" slide | ⭐⭐ (intentional) |

### Title Generation Fix (Jan 2026)

A címgenerálás mostantól csak a user üzenetét használja, nem az AI válaszát. Ez megakadályozza, hogy artifact tartalom kerüljön a conversation title-be és a share link címébe.

**Problem solved:** Share linkek címe tartalmazta az artifact markdown tartalmat (`:::artifact{...}`).

**Solution:** Üres `contentParts` átadása a `generateTitle()` hívásnak.

**Key file:** `api/server/controllers/agents/client.js` (line ~1260)

```javascript
// Use only user text for title generation to avoid artifact content in titles
const titleResult = await this.run.generateTitle({
  // ...
  contentParts: [],  // Empty - only use inputText (user message)
  // ...
});
```

**Note:** Ez a fix csak ÚJ beszélgetésekre vonatkozik. Meglévő rossz címek manuálisan javíthatók a MongoDB-ben vagy a chat átnevezésével.

### Shared View Restrictions (Jan 2026)

Megosztott artifact nézetben a Copy és Export gombok el vannak rejtve.

**Key file:** `client/src/components/Artifacts/Artifacts.tsx`

```tsx
{!isSharedConvo && (
  <>
    <CopyCodeButton content={currentArtifact.content ?? ''} />
    <ExportDropdown artifact={currentArtifact} previewRef={previewRef} />
  </>
)}
```

## PWA / Desktop App

Az app telepíthető desktop appként (PWA - Progressive Web App).

### Konfiguráció

**Fájl:** `client/vite.config.ts` (94-128. sor)

```typescript
manifest: {
  name: 'Actionable+ AI Consultant',
  short_name: 'Actionable+',
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#009688',
  icons: [...]
}
```

### Telepítés

1. Nyisd meg `https://app.actionableplus.com` Chrome-ban vagy Edge-ben
2. Kattints a címsor jobb oldalán a telepítés ikonra (⊕)
3. "Install Actionable+" - kész

### Frissítés után

Ha módosítod a manifest-et (név, ikonok):
1. Deploy után töröld a régi PWA-t
2. Telepítsd újra a böngészőből

## Footer Version Display

A footer dinamikusan megjeleníti a git commit hash-t és branch-et.

### Működés

**Lokális fejlesztés:** `git rev-parse` parancsokból
**Railway deploy:** `RAILWAY_GIT_COMMIT_SHA` és `RAILWAY_GIT_BRANCH` env változókból

### Railway Git Info

A Dockerfile tartalmazza a szükséges ARG-okat, hogy Railway átadja a git infót build time-ban:

```dockerfile
# Line ~20
ARG RAILWAY_GIT_COMMIT_SHA=""
ARG RAILWAY_GIT_BRANCH=""

# Line ~50 (before npm run frontend)
ENV RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}
ENV RAILWAY_GIT_BRANCH=${RAILWAY_GIT_BRANCH}
```

**Vite config:** `client/vite.config.ts` - `getGitInfo()` függvény

**Footer komponens:** `client/src/components/Nav/SettingsTabs/General/General.tsx`

**FONTOS:** Ne használj `CUSTOM_FOOTER` env változót Railway-en, mert felülírja a dinamikus footer-t!

## Memory System (Persistent Context)

A memory rendszer chat-ok között megjegyzi a felhasználó fontos adatait.

### Konfiguráció

**Fájl:** `librechat.yaml`

```yaml
memory:
  disabled: false
  personalize: true           # User ki/be kapcsolhatja Settings-ben
  tokenLimit: 12000           # Max tárolt memória tokenben
  charLimit: 20000            # Max karakter/bejegyzés
  messageWindowSize: 20       # Elemzett üzenetek száma
  validKeys:                  # Strukturált kategóriák
    - "user_info"             # Név, cég, szerep
    - "project_context"       # Projekt részletek
    - "preferences"           # Preferenciák
    - "business_info"         # Üzleti kontextus
    - "action_items"          # Teendők, határidők
  agent:
    provider: "anthropic"
    model: "claude-haiku-4-5-20251001"
    instructions: |
      Custom instructions for memory extraction...
```

### Működés

1. Minden üzenet után a **Haiku** model elemzi az utolsó 20 üzenetet
2. Releváns infókat kivonja és tárolja a `validKeys` kategóriákba
3. Új chat indításakor a tárolt memóriák betöltődnek a system prompt-ba
4. User a Settings → Personalization-ben ki/be kapcsolhatja

### Költség

- Memory agent (Haiku): ~$0.0005/üzenet
- Minimális overhead (<5% a fő agent költségéhez képest)

### Context Window

Az agent **200k token** context window-t használ (Claude Opus 4.5 default).
- ~100-150 üzenet + artifact-ok beleférnek
- Ha túl hosszú a chat → régi üzenetek discard (de memory megmarad)

## Agent System Prompts

Agent system prompt-ok az `/agents` mappában találhatók.

### Best Practices

- **Write prompts in English** - models understand English better
- **Response language** - output should match user's prompt language
- **Reproducibility** - scoring/evaluation should be consistent across runs
- **Binary evaluation** - yes/no, not "partially"

### Available Agents

| Agent | File | Description |
|-------|------|-------------|
| CRO Audit | `agents/cro-audit-agent.md` | E-commerce CRO audit with checklist |
| Marketing Content Creator | `agents/marketing-content-creator.md` | Pomelli-style brand analysis + content generation |
| Creative Designer | `agents/creative-designer.md` | Product photography and ad creatives |
| Photo Editor | `agents/photo-editor.md` | Image editing and enhancement |
| Web Researcher | `agents/web-researcher.md` | Web research and data gathering |

## Google OAuth Login

Google login engedélyezéséhez állítsd be ezeket Railway environment variables-ban:

```bash
ALLOW_SOCIAL_LOGIN=true
ALLOW_SOCIAL_REGISTRATION=true
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=/oauth/google/callback
```

### Google Cloud Console Setup

1. Menj a [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Authorized redirect URIs: `https://app.actionableplus.com/oauth/google/callback`
5. Másold ki a Client ID és Client Secret-et
6. Add hozzá Railway Variables-hoz

## Search (Meilisearch)

A chat history search Meilisearch-et használ.

### Local Development

A `docker-compose.yml` tartalmazza a Meilisearch containert. Lokálisan automatikusan működik.

```bash
# .env beállítások (már be vannak állítva)
SEARCH=true
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=<your-key>
```

### Railway Deployment

Railway-en külön Meilisearch service kell:
1. Add New → Database → Meilisearch
2. Állítsd be a `MEILI_HOST` és `MEILI_MASTER_KEY` változókat az ActionablePlus service-ben

## Agent Marketplace

Az Agent Marketplace lehetővé teszi, hogy a felhasználók böngésszék és használják a publikus agenteket.

### Engedélyezés

A `librechat.yaml`-ban:

```yaml
interface:
  marketplace:
    use: true  # Engedélyezi minden user számára
```

### Default Permissions

| Szerepkör | Marketplace hozzáférés |
|-----------|------------------------|
| Admin | ✅ Alapból engedélyezve |
| User | ❌ Alapból letiltva |

A `librechat.yaml` `interface.marketplace.use: true` beállítással minden user számára engedélyezhető.

### Működés

1. Sidebar-on megjelenik a "Marketplace" gomb
2. Felhasználók böngészhetik a publikus agenteket
3. Egy kattintással hozzáadhatják a kedvenceikhez
4. Admin beállíthatja, mely agentek legyenek publikusak

## Conversation Starters (Agent Builder Feature)

Az Agent Builder-ben beállítható conversation starters, amelyek a chat indításakor kattintható gombok formájában jelennek meg.

### Működés

1. Agent Builder → "Conversation Starters" szekció
2. Max 4 starter adható meg
3. Gombok megjelennek új chat indításakor
4. Kattintásra automatikusan elküldi az üzenetet

### Lokalizáció

A funkció 31 nyelvre le van fordítva (EN, HU, DE, stb.):

| Kulcs | English | Magyar |
|-------|---------|--------|
| `com_assistants_conversation_starters` | Conversation Starters | Beszélgetésindítók |
| `com_assistants_conversation_starters_placeholder` | Enter a conversation starter | Adjon meg egy beszélgetésindítót |
| `com_assistants_max_starters_reached` | Max number of conversation starters reached | Max. beszélgetésindítók elérve |

### Implementáció

| File | Purpose |
|------|---------|
| `client/src/common/agents-types.ts` | `AgentForm.conversation_starters` type |
| `client/src/components/SidePanel/Agents/AgentConfig.tsx` | UI komponens |
| `client/src/components/SidePanel/Agents/AgentPanel.tsx` | Payload extraction |
| `client/src/locales/*/translation.json` | Lokalizációs fájlok (31 nyelv) |

## Railway Rollback - Stable Commits

Ha problémás a deploy, Railway dashboard-on visszaállítható egy korábbi stabil verzióra:

1. Railway Dashboard → Service → **Deployments** tab
2. Válaszd ki a működő deploy-t
3. Kattints a **Redeploy** gombra

### Utolsó ismert stabil commit-ok:

| Commit | Dátum | Leírás |
|--------|-------|--------|
| `7e377ddd` | Dec 31 | 🐛 fix: Prevent QueryClient recreation on re-renders |
| `5b7f626c` | Dec 31 | 🔧 fix: Simplify theme CSS to font-only |

### Admin Usage Feature - INSTABIL (NE HASZNÁLD)

A `666555f4` és `2206c040` commit-ok Admin Usage Analytics funkciót adtak hozzá, de ez **stream 404 hibákat okoz** minden chat-ben. Ha véletlenül deploy-oltad:

1. Railway → Deployments → válaszd a `7e377ddd` előtti deploy-t
2. Redeploy

**Tünetek:**
- "Stream not found (404) - job completed or expired"
- "Stream error (network failure) - will attempt reconnect"
- Chat nem működik semmilyen modellel/agent-tel
