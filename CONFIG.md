# ActionablePlus - Konfiguráció Dokumentáció

**Frissítve:** 2025-12-27

---

## Fájlok Áttekintése

| Fájl | Célcsoport | Tartalom |
|------|------------|----------|
| `.env` | Szerver | API kulcsok, környezeti változók |
| `librechat.yaml` | Alkalmazás | Modellek, MCP, UI beállítások |
| `docker-compose.yml` | DevOps | Konténer konfiguráció |
| `docker-compose.override.yml` | DevOps | Helyi testreszabások |

---

# .env Beállítások

## 1. Szerver

| Változó | Érték | Leírás |
|---------|-------|--------|
| `HOST` | `localhost` | Szerver host |
| `PORT` | `3080` | Alkalmazás portja |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/LibreChat` | MongoDB kapcsolat |
| `DOMAIN_CLIENT` | `http://localhost:3080` | Kliens domain |
| `DOMAIN_SERVER` | `http://localhost:3080` | Szerver domain |
| `DEBUG_LOGGING` | `true` | Debug logolás |

---

## 2. AI Providerek

### Anthropic (Claude)

| Változó | Leírás |
|---------|--------|
| `ANTHROPIC_API_KEY` | API kulcs (sk-ant-...) |
| `ANTHROPIC_MODELS` | Elérhető modellek |

**Modellek (Dec 2025):**
| Model ID | Típus | Leírás |
|----------|-------|--------|
| `claude-opus-4-5-20251101` | Opus | Legképesebb, komplex feladatok |
| `claude-sonnet-4-5-20250929` | Sonnet | Kiegyensúlyozott (alapértelmezett) |
| `claude-haiku-4-5-20251001` | Haiku | Gyors, költséghatékony |

---

### Google (Gemini)

| Változó | Leírás |
|---------|--------|
| `GOOGLE_KEY` | API kulcs (AIza...) |
| `GOOGLE_MODELS` | Elérhető modellek |

**Modellek (Dec 2025):**
| Model ID | Típus | Leírás |
|----------|-------|--------|
| `gemini-3-pro-preview` | Pro | Legújabb, multimodal |
| `gemini-3-flash-preview` | Flash | Gyors reasoning |
| `gemini-2.5-pro` | Pro | Thinking model (STEM) |
| `gemini-2.5-flash` | Flash | Legjobb ár/érték |

---

### OpenAI

| Változó | Leírás |
|---------|--------|
| `OPENAI_API_KEY` | API kulcs (sk-proj-...) |
| `OPENAI_MODELS` | Elérhető modellek |

**Modellek (Dec 2025):**
| Model ID | Típus | Leírás |
|----------|-------|--------|
| `gpt-5.2` | GPT-5 | Legújabb flagship |
| `gpt-5.1` | GPT-5 | Előző generáció |
| `gpt-5` | GPT-5 | Alap |
| `gpt-5-mini` | GPT-5 | Kisebb, gyorsabb |
| `gpt-5-nano` | GPT-5 | Legkisebb |
| `o4-mini` | Reasoning | Legújabb kis reasoning |
| `o3` | Reasoning | Reasoning model |
| `o1` / `o1-mini` | Reasoning | Korábbi reasoning |

---

## 3. Keresés (MeiliSearch)

| Változó | Érték | Leírás |
|---------|-------|--------|
| `SEARCH` | `true` | Keresés engedélyezve |
| `MEILI_HOST` | `http://0.0.0.0:7700` | MeiliSearch URL |
| `MEILI_MASTER_KEY` | `[generated]` | Titkos kulcs |

---

## 4. Felhasználói Rendszer

### Regisztráció
| Változó | Érték | Leírás |
|---------|-------|--------|
| `ALLOW_EMAIL_LOGIN` | `true` | Email bejelentkezés |
| `ALLOW_REGISTRATION` | `true` | Regisztráció engedélyezve |
| `ALLOW_SOCIAL_LOGIN` | `false` | OAuth kikapcsolva |
| `ALLOW_UNVERIFIED_EMAIL_LOGIN` | `true` | Nincs email megerősítés |
| `ALLOW_PASSWORD_RESET` | `false` | Jelszó reset kikapcsolva |

### Session
| Változó | Érték | Leírás |
|---------|-------|--------|
| `SESSION_EXPIRY` | 15 perc | Session timeout |
| `REFRESH_TOKEN_EXPIRY` | 7 nap | Token érvényesség |

---

## 5. Moderáció

| Változó | Érték | Leírás |
|---------|-------|--------|
| `OPENAI_MODERATION` | `false` | Content moderáció kikapcsolva |
| `BAN_VIOLATIONS` | `true` | Tiltás aktív |
| `BAN_DURATION` | 2 óra | Tiltás időtartama |
| `LIMIT_CONCURRENT_MESSAGES` | `true` | Párhuzamos limit |
| `CONCURRENT_MESSAGE_MAX` | `2` | Max párhuzamos üzenet |

---

## 6. UI Testreszabás

| Változó | Érték | Leírás |
|---------|-------|--------|
| `APP_TITLE` | `Actionable+` | Böngésző cím |
| `CUSTOM_FOOTER` | `Actionable+ AI Consultant - Powered by Kolbert AI` | Lábléc |
| `HELP_AND_FAQ_URL` | `https://actionableplus.com` | Súgó link |

---

## 7. MCP (Model Context Protocol)

| Változó | Érték | Leírás |
|---------|-------|--------|
| `MCP_INIT_TIMEOUT_MS` | `120000` | Init timeout (2 perc) |

---

## 8. Megosztás

| Változó | Érték | Leírás |
|---------|-------|--------|
| `ALLOW_SHARED_LINKS` | `true` | Chat megosztás |
| `ALLOW_SHARED_LINKS_PUBLIC` | `true` | Publikus linkek |

---

# librechat.yaml

```yaml
version: 1.2.1
cache: true

# Alapértelmezett modell beállítás
modelSpecs:
  prioritize: true
  list:
    - name: claude-sonnet
      label: Claude Sonnet 4.5
      default: true                    # Ez lesz az alapértelmezett
      preset:
        endpoint: anthropic
        model: claude-sonnet-4-5-20250929

# MCP Browser Automation (Browserbase/Stagehand)
mcpServers:
  browserbase:
    type: streamable-http
    url: https://stagehand-mcp-server-production.up.railway.app/mcp
    timeout: 600000                    # 10 perc (hosszú browser műveletek)
    initTimeout: 30000                 # 30 sec init
    requiresOAuth: false
    title: "Browser Automation"
    description: "AI-powered browser control with Stagehand"
```

---

# Browser Preview UI (Manus-style)

A browser preview komponensek Manus.im stílusban jelenítik meg a böngésző munkamenetet.

## Komponensek

| Komponens | Fájl | Funkció |
|-----------|------|---------|
| **BrowserThumbnail** | `client/src/components/BrowserPreview/BrowserThumbnail.tsx` | Kompakt preview kártya a chat input felett |
| **BrowserSidePanel** | `client/src/components/BrowserPreview/BrowserSidePanel.tsx` | Teljes böngésző panel a chat mellett (480px) |
| **currentBrowsedUrlFamily** | `client/src/store/browserSession.ts` | Recoil atom a böngészett URL-hez |

## Működés

1. **Navigate tool** meghívásakor a `ToolCall.tsx` kinyeri az URL-t az args-ból
2. A URL mentésre kerül a `currentBrowsedUrlFamily` Recoil atomba (conversation ID alapján)
3. A **BrowserThumbnail** megjeleníti a valódi böngészett URL-t (nem a browserbase debug URL-t)
4. Kattintásra megnyílik a **BrowserSidePanel** a teljes böngésző nézettel

## Fontos fájlok

```
client/src/components/BrowserPreview/
├── BrowserThumbnail.tsx    # Kompakt preview kártya
├── BrowserSidePanel.tsx    # Teljes panel
├── index.ts                # Exportok
└── types.ts                # TypeScript típusok

client/src/store/
└── browserSession.ts       # Recoil atomok (activeUIResourceFamily, browserSidePanelOpenFamily, currentBrowsedUrlFamily)

client/src/components/Chat/
├── ChatView.tsx            # BrowserSidePanel integrációja
└── Input/ChatForm.tsx      # BrowserThumbnail integrációja
```

---

# Nem Használt Funkciók

A következő funkciók elérhetők, de jelenleg nincsenek konfigurálva:

| Funkció | Státusz | Megjegyzés |
|---------|---------|------------|
| Azure OpenAI | Deprecated | Használj direkt OpenAI-t |
| AWS Bedrock | Nincs | Alternatív provider |
| DALL-E / Flux | Nincs API kulcs | Képgenerálás |
| STT/TTS | Nincs API kulcs | Beszéd funkciók |
| RAG | Nincs | Dokumentum keresés |
| Redis | Nincs | Caching (nem szükséges kis mérethez) |
| Firebase/S3/Azure Storage | Nincs | Fájl tárolás |
| Social Login | Kikapcsolva | Discord, GitHub, Google, stb. |
| LDAP/SAML/OpenID | Nincs | Enterprise auth |
| Email Service | Nincs | Jelszó reset emailek |

---

# Docker Konfiguráció

## docker-compose.override.yml

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    image: librechat-local:latest
    volumes:
      - type: bind
        source: ./librechat.yaml
        target: /app/librechat.yaml
        read_only: true
```

**Fontos:** A `build` szekció miatt a helyi kód változások alkalmazásához újra kell építeni:

```bash
docker-compose build --no-cache api && docker-compose up -d api
```

---

# Gyakori Műveletek

## Konfig változás után
```bash
# .env vagy librechat.yaml változás
docker-compose restart api

# Frontend kód változás (új build szükséges)
docker-compose build --no-cache api && docker-compose up -d api
```

## Logok megtekintése
```bash
docker-compose logs -f api
```

## Teljes újraindítás
```bash
docker-compose down && docker-compose up -d
```

---

# Hivatkozások

- [LibreChat Dokumentáció](https://www.librechat.ai/docs)
- [LibreChat .env Referencia](https://www.librechat.ai/docs/configuration/dotenv)
- [LibreChat YAML Konfig](https://www.librechat.ai/docs/configuration/librechat_yaml)
- [OpenAI Modellek](https://platform.openai.com/docs/models)
- [Anthropic Modellek](https://docs.anthropic.com/en/docs/about-claude/models)
- [Google Gemini](https://ai.google.dev/gemini-api/docs/models)
