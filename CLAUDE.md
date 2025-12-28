# ActionablePlus Chat - E-Commerce Consultant App

## Project Overview

E-commerce consulting app with specialized AI agents (based on LibreChat).

**Current Date:** 2025-12-27

## Tech Stack

- **Base:** https://github.com/kolbertistvan2/actionableplus (LibreChat fork)
- **AI Providers:**
  - Anthropic Claude (primary)
  - Google Gemini
  - OpenAI
- **Deployment:** Railway (planned)
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
1. Fork (GitHub) → 2. Local Docker → 3. Railway Deploy
```

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
- **Production:** https://actionableplus-production.up.railway.app

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
DOMAIN_CLIENT=https://actionableplus-production.up.railway.app
DOMAIN_SERVER=https://actionableplus-production.up.railway.app
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

### librechat.yaml MCP Config

```yaml
mcpServers:
  browserbase:
    type: streamable-http
    url: https://stagehand-mcp-server-production.up.railway.app/mcp
    timeout: 600000
  gemini-image:
    type: streamable-http
    url: https://gemini-image-mcp-production.up.railway.app/mcp
    timeout: 120000
```

## Gemini Image Generation (Completed)

Image generation for the Creative Designer agent is implemented via a custom MCP server.

### Why MCP Server?

The LangChain JS package (`@langchain/google-genai` v0.2.18) does NOT support the `responseModalities` parameter needed for Gemini image generation. The Python package supports it, but JS doesn't yet. See: [GitHub Issue #9682](https://github.com/langchain-ai/langchainjs/issues/9682)

**Solution:** Custom MCP server that uses `@google/genai` SDK directly, bypassing LangChain.

### Architecture

```
Creative Designer Agent (gemini-3-pro-preview)
    ↓ calls generate_image tool
gemini-image-mcp server (Railway US East)
    ↓ uses @google/genai SDK
Google Gemini API (gemini-3-pro-image-preview)
    ↓ returns base64 image
Agent displays image in chat
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| gemini-image-mcp | https://github.com/kolbertistvan2/gemini-image-mcp | MCP server repo |
| Railway Service | US East region (required for Gemini image gen) | Hosting |
| generate_image tool | MCP server | Tool that agents call |

### Agent Configuration

The Creative Designer agent must:
1. Use a smart model (e.g., `gemini-3-pro-preview`) that can call tools
2. Have `gemini-image` MCP tool enabled in Agent Builder
3. Have instructions that explicitly tell it to use `generate_image` tool

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
