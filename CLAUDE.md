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

endpoints:
  agents:
    recursionLimit: 50      # Default: 25
    maxRecursionLimit: 100  # Max allowed
```

### Stagehand MCP Server Config

**Model:** `google/gemini-3-flash-preview`

**System Prompt:** Custom prompt instructs AI to always click search buttons explicitly (not Enter key) for reliable form submission.

**Config file:** `/Users/kolbert/Dev/stagehand-mcp-server/src/config.ts`

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

### Content-based Markdown Detection

A `client/src/hooks/Artifacts/useArtifactProps.ts` fájlban lévő `shouldRenderAsMarkdown()` függvény automatikusan detektálja, ha a tartalom plain text/markdown és nem React kód. Ez biztosítja, hogy bármely AI model/agent által generált szöveges tartalom megfelelően formázva jelenik meg.

**Detektált kód minták (ha ezek nincsenek → markdown):**
- ES imports/exports
- const/function/class deklarációk
- JSX komponensek
- React hooks
- HTML doctype

### Artifact Export

A `client/src/components/Artifacts/ExportArtifact.tsx` komponens dropdown menüt biztosít az artifact exportálásához különböző formátumokban.

**Támogatott formátumok:**
- **TXT** - Plain text
- **DOCX** - Word dokumentum (markdown formázással)
- **PDF** - PDF dokumentum
- **CSV** - Táblázat export (ha van táblázat a tartalomban)
- **XLSX** - Excel export (ha van táblázat a tartalomban)

**Függőségek (client/package.json):**
- `docx` - DOCX generálás
- `jspdf` - PDF generálás
- `xlsx` - Excel export

**Táblázat detektálás:**
- Markdown táblák: `| col1 | col2 |`
- HTML táblák: `<table>`
- Tab-separated values
