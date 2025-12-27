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
- **Pending:** MCP browser automation integration

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
- **Production:** TBD (Railway)

## Notes

- First registered user becomes admin
- Works without librechat.yaml (uses defaults)
- API keys configured in .env file
- MCP integration requires librechat.yaml with mcpServers section

## MCP Integration (TODO)

To enable browser automation with Stagehand MCP:

1. Create `librechat.yaml` with mcpServers config
2. Mount it in docker-compose.override.yml
3. Rebuild with custom Dockerfile (for code changes)

See `claude-plan.md` for detailed MCP architecture plan.
