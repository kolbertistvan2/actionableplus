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

### Chat Copy to Clipboard

A chat üzenet "Copy to clipboard" gombja kiszűri az artifact blokkokat, így csak a szöveges tartalom másolódik.

**Implementáció:** `client/src/hooks/Messages/useCopyToClipboard.ts`

```typescript
// Regex: :::artifact{...} ... ::: blokkok eltávolítása
text.replace(/:::artifact\{[^}]*\}[\s\S]*?\n:::\s*(?:\n|$)/g, '').trim()
```

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
