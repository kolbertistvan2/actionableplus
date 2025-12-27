Claude’s Plan
E-Commerce Consultant Chat App - LibreChat Fork
Project Summary
A multilingual e-commerce consultant chatbot application built as a LibreChat fork, deployed on Railway, with multiple access tiers (guest, registered, invited, paid) and specialized AI agents for e-commerce consulting.
Aspect	Choice
Base	LibreChat fork (own GitHub repo)
AI Provider	Anthropic Claude (primary)
Deployment	Railway
Languages	Hungarian, English (+ more via i18n)
Auth	Guest demo, Registration, Invite, Paid subscription
Approach

danny-avila/LibreChat (upstream)
         │
         ▼ Fork
your-github/actionableplus-chat (your repo)
         │
         ├── Phase 1: Config only (librechat.yaml, .env)
         ├── Phase 2: Branding (colors, theme in client/src)
         └── Phase 3: Custom features (payment, guest mode)
1. Miért LibreChat Fork?
Mi az a Fork?
A fork a LibreChat kód saját másolata a te GitHub fiókodban:

danny-avila/LibreChat (eredeti)
    → Fork →
te-neved/ecommerce-chat (saját repo)
Ezzel:
Teljes kontroll a kód felett
Egyedi módosítások (színek, témák, funkciók)
Frissíthető az eredeti LibreChat-ből (upstream sync)
Saját deployment pipeline
Előnyök
✅ Teljes agent rendszer - No-code Agent Builder UI, verziókezelés, jogosultságok
✅ 42 nyelv támogatása - Beépített i18n (magyar is elérhető)
✅ Rugalmas autentikáció - Email/jelszó, OAuth, vendég mód
✅ Railway támogatás - Előre elkészített deployment template-ek
✅ RAG integráció - Dokumentum alapú tudásbázis agentekhez
✅ Token/kredit rendszer - Felhasználói kvóták kezelése
✅ Saját repo - Teljes kontroll, egyedi módosítások lehetősége
Kompromisszumok
⚠️ Upstream frissítések merge-elése időnként konfliktusokkal járhat
⚠️ Admin dashboard 2025-ben érkezik (CLI-vel működik addig)
2. Rendszer Architektúra

┌─────────────────────────────────────────────────────────────┐
│                      Railway Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  LibreChat   │  │   MongoDB    │  │  Meilisearch │       │
│  │   API + UI   │  │   (Atlas)    │  │   (Search)   │       │
│  └──────┬───────┘  └──────────────┘  └──────────────┘       │
│         │                                                    │
│  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   RAG API    │  │  PostgreSQL  │  │  Redis       │       │
│  │ (Dokumentum) │  │  + pgvector  │  │  (Cache)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Provider-ek                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  OpenAI  │  │ Anthropic│  │   Groq   │  │  Google  │    │
│  │  GPT-4o  │  │  Claude  │  │  Llama   │  │  Gemini  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
3. E-Commerce Agent-ek Terve
3.1 Általános E-Commerce Konzultáns (Főoldal Agent)

name: "E-Commerce Tanácsadó"
description: "Átfogó e-commerce stratégiai tanácsadás"
model: "gpt-4o" vagy "claude-sonnet-4"
capabilities:
  - web_search (trendek, piaci információk)
  - file_search (tudásbázis)
  - execute_code (elemzések)
instructions: |
  Te egy tapasztalt e-commerce szakértő vagy. Segíted az ügyfeleket
  webshopjuk fejlesztésében, stratégia kialakításában és növekedésben.
  Kérdezz vissza, ha több kontextus kell a pontos tanácsadáshoz.
3.2 Tematikus Agent-ek
Agent	Fókusz	Javasolt Képességek
Webshop Stratégia	Üzleti modell, bevétel, növekedés	file_search, web_search
Piackutatás	Piacelemzés, trendek, fogyasztói viselkedés	web_search, execute_code
Marketing	Kampányok, tartalom, csatornák	web_search, file_search
Logisztika	Szállítás, fulfillment, készletezés	execute_code, file_search
Árösszehasonlítás	Versenytárs árak, árképzés	web_search, execute_code, actions
Versenytárs Elemzés	Kompetitív intelligencia	web_search, execute_code
3.3 Jövőbeli Agent-ek (Folyamatos Fejlesztés)
SEO Optimalizáló
Konverzió Növelő
Email Marketing Specialista
Social Media Manager
Ügyfélszolgálati Asszisztens
4. Konfiguráció Fájlok
4.1 librechat.yaml - Fő Konfiguráció

version: 1.2.1
cache: true

# UI Testreszabás
interface:
  customWelcome: "Üdvözöljük! Miben segíthetek ma az e-commerce projektjével?"
  privacyPolicy:
    externalUrl: 'https://yourdomain.com/privacy'
  termsOfService:
    externalUrl: 'https://yourdomain.com/terms'
  endpointsMenu: true
  agents: true

# Agent Beállítások
endpoints:
  agents:
    disableBuilder: false  # Admin építhet agent-eket
    recursionLimit: 50
    capabilities:
      - "execute_code"
      - "file_search"
      - "web_search"
      - "actions"
      - "artifacts"

# AI Provider-ek
  openAI:
    apiKey: "${OPENAI_API_KEY}"
    models:
      default: ["gpt-4o", "gpt-4o-mini"]

  anthropic:
    apiKey: "${ANTHROPIC_API_KEY}"
    models:
      default: ["claude-sonnet-4-20250514"]

# Web Keresés (Agent-ekhez)
webSearch:
  searchProvider: "serper"
  scraperProvider: "firecrawl"
  rerankerType: "jina"

# Kredit/Kvóta Rendszer
balance:
  enabled: true
  startBalance: 50000  # Új felhasználóknak
  autoRefillEnabled: false

# Nyelvi Beállítás
registration:
  socialLogins: ["google"]
4.2 .env - Környezeti Változók

# Szerver
HOST=0.0.0.0
PORT=3080
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/LibreChat

# AI Provider-ek
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Autentikáció
ALLOW_EMAIL_LOGIN=true
ALLOW_REGISTRATION=true
ALLOW_SOCIAL_LOGIN=true
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# JWT
JWT_SECRET=hosszu-random-string
JWT_REFRESH_SECRET=masik-hosszu-random-string

# Web Search
SERPER_API_KEY=...
FIRECRAWL_API_KEY=...
JINA_API_KEY=...

# RAG (Dokumentum Keresés)
RAG_API_URL=http://rag_api:8000
EMBEDDINGS_PROVIDER=openai
5. Deployment Terv (Railway)
5.1 Lépések
Railway Account + Projekt Létrehozása
Új projekt létrehozása Railway-en
LibreChat template használata: https://railway.com/deploy/cnhjS_ (RAG-gal)
Szolgáltatások Konfigurálása
MongoDB Atlas csatlakoztatása (ajánlott külső DB a megbízhatóságért)
Environment változók beállítása
librechat.yaml URL megadása CONFIG_PATH-ként
Domain Beállítás
Custom domain hozzáadása (pl. chat.yourdomain.com)
SSL automatikus
Agent-ek Létrehozása
Bejelentkezés admin fiókkal
Agent Builder-ben agent-ek konfigurálása
Tudásbázis feltöltése (PDF-ek, dokumentumok)
5.2 Railway Template Komponensek
Szolgáltatás	Cél
LibreChat	Fő alkalmazás
MongoDB	Beszélgetések, felhasználók, agent-ek
Meilisearch	Üzenet keresés
RAG API	Dokumentum keresés (file_search)
PostgreSQL + pgvector	Vector embeddings
6. Többnyelvűség
Beépített Támogatás
LibreChat 42 nyelvet támogat natívan
Magyar (hu) már elérhető
Felhasználók böngésző nyelve alapján automatikus
Teendők
Ellenőrizni a magyar fordítás minőségét
Agent instruction-ök magyar és angol verzióban
Welcome message nyelv-specifikus (ha szükséges)
7. Felhasználói Hozzáférés - Többszintű Modell
A te igényeid alapján egy hibrid rendszer kell:
7.1 Hozzáférési Szintek
Szint	Ki használhatja	Kvóta	Funkciók
Vendég	Bárki, belépés nélkül	5-10 üzenet/nap	Általános agent
Regisztrált	Email-lel regisztrált	50-100 üzenet/nap	Minden agent
Meghívott	Admin által meghívott	Emelt limit	Minden + prioritás
Előfizető	Fizetős felhasználó	Korlátlan	Minden + prémium
7.2 LibreChat Beállítások

# librechat.yaml
registration:
  allowedDomains: []  # Bárki regisztrálhat

interface:
  endpointsMenu: true
  agents: true

balance:
  enabled: true
  startBalance: 10000  # Regisztrált felhasználóknak
  autoRefillEnabled: false

# .env
ALLOW_REGISTRATION=true
ALLOW_SOCIAL_LOGIN=true
GOOGLE_CLIENT_ID=...
7.3 Vendég Mód (Bejelentkezés nélküli használat)
Fontos: A LibreChat alapból nem támogatja a vendég módot natívan! Megoldási opciók:
Demo account - Nyilvános "demo@yoursite.com" fiók megosztása (egyszerű)
Custom fork módosítás - Vendég session implementálása (fejlesztés kell)
Landing page - Külső form → API hívás demózásra (legelegánsabb)
7.4 Fizetős Előfizetés
LibreChat-ben nincs beépített fizetés. Opciók:
Stripe integráció - Custom webhook → balance növelés
Külső előfizetés kezelő - Memberstack, Outseta
Manuális - Admin CLI-vel balance hozzáadás
7.5 Meghívásos Rendszer
LibreChat támogatja:

npm run invite-user -- --email user@example.com --role user
Admin Jogosultságok
Első regisztrált felhasználó = Admin
CLI-vel további admin-ok hozzáadhatók
Agent-ek megosztása felhasználókkal
8. Ügyfélszerzési Funkciók
Beépített Lehetőségek
Token Kredit Rendszer - Ingyenes próba → fizetős konverzió
Banner Rendszer - Promóciók, ajánlatok megjelenítése
Custom Welcome - Személyre szabott üdvözlés
Javasolt Kiegészítések
Landing page a LibreChat előtt (külön fejlesztés)
Email gyűjtés regisztrációnál
Referral program (custom fejlesztés)
9. Implementation Steps
Phase 1: Fork & Infrastructure Setup
 Fork LibreChat to your GitHub (actionableplus-chat)
 Create MongoDB Atlas cluster (free tier)
 Create Railway project
 Connect Railway to your GitHub repo
 Configure environment variables
 Deploy and verify basic functionality
Phase 2: Configuration & Branding
 Create librechat.yaml with your settings
 Configure Anthropic Claude as primary provider
 Set up token/balance system
 Replace logo (client/dist/assets/)
 Set Hungarian welcome message
 Add Privacy/Terms links
Phase 3: Create E-Commerce Agents
 General E-Commerce Consultant agent
 Webshop Strategy agent
 Marketing agent
 Market Research agent
 Additional agents as needed
Phase 4: Access Tiers Implementation
 Configure registration settings
 Set up invite system (CLI)
 Implement guest demo (demo account or landing page)
 Plan Stripe integration for paid tier (future)
Phase 5: Customization (Fork Benefits)
 Modify color scheme (client/src/style.css)
 Custom theme if needed
 Build and deploy custom version
Phase 6: Knowledge Base & Testing
 Upload e-commerce documentation (RAG)
 Test agent prompts and iterate
 Collect user feedback
 Fine-tune credit limits
10. Költségbecslés
Tétel	Becsült Költség/hó
Railway (Starter)	$5-20
MongoDB Atlas (M0)	Ingyenes
OpenAI API	Használat alapján
Anthropic API	Használat alapján
Serper (Search)	$50/100k query
Domain	$10-15/év
Kezdő költség: ~$50-100/hó (API használattól függően)
11. Key Files to Modify
Phase 1 - Config Only (no rebuild needed)
File	Purpose
librechat.yaml	Main configuration (agents, UI, endpoints)
.env	Environment variables (API keys, DB, auth)
client/dist/assets/logo.svg	Logo (Docker volume mount)
Phase 2+ - Fork Customization (rebuild needed)
File	Purpose
client/src/style.css	Colors, fonts, theme
client/src/locales/hu/	Hungarian translations
api/server/routes/	Custom API endpoints (if needed)
Dockerfile	Custom build configuration
12. Development Workflow

┌─────────────────────────────────────────────────────────────────┐
│  1. FORK              2. LOCAL DEV            3. PRODUCTION     │
│  ──────────           ──────────              ──────────        │
│  GitHub Fork    →     Docker Desktop    →     Railway Deploy    │
│  actionableplus-chat  localhost:3080          yourdomain.com    │
└─────────────────────────────────────────────────────────────────┘
Step 1: GitHub Fork

# 1. Go to https://github.com/danny-avila/LibreChat
# 2. Click "Fork" button
# 3. Name: actionableplus-chat
# 4. Clone to local:
git clone https://github.com/YOUR_USERNAME/actionableplus-chat
cd actionableplus-chat
Step 2: Local Development (Docker Desktop)
Requirements:
Docker Desktop installed and running
Git
Setup:

# Copy environment template
cp .env.example .env

# Edit .env with your API keys:
# - ANTHROPIC_API_KEY=sk-ant-...
# - MONGO_URI (local Docker MongoDB will be created automatically)

# Start all services
docker-compose up -d

# Access at: http://localhost:3080
Local Docker services:
LibreChat API + UI (port 3080)
MongoDB (port 27017)
Meilisearch (port 7700)
RAG API (port 8000)
Development cycle:

Edit code → docker-compose up --build → Test at localhost:3080
Step 3: Railway Deployment
When local testing is complete:

# Commit changes
git add .
git commit -m "Custom configuration for actionableplus-chat"
git push origin main

# Then in Railway:
# 1. New Project → Deploy from GitHub repo
# 2. Select actionableplus-chat
# 3. Add environment variables
# 4. Deploy!
13. First Steps (Today)
Fork LibreChat → https://github.com/danny-avila/LibreChat → Fork → actionableplus-chat
Clone locally → git clone https://github.com/YOUR_USERNAME/actionableplus-chat
Get Anthropic API key → console.anthropic.com
Copy .env.example → .env and add your API key
Start Docker → docker-compose up -d
Open → http://localhost:3080
Register first user (becomes admin)
Test and configure → Create agents, test features
When ready → Push to GitHub → Deploy to Railway
Ready to Start?
A terv készen áll! Kezdjük a fork létrehozásával és a lokális Docker környezet beállításával.
User approved the plan
Kezdjük az implementációt! Készítek egy todo listát a következő lépésekhez.
Update Todos

Fork LibreChat to GitHub (actionableplus-chat)

Clone repo locally to /Users/kolbert/Dev/actionableplus-chat

Configure .env file with Anthropic API key

Start Docker Desktop and run docker-compose up

Test LibreChat at localhost:3080

Register first admin user
Kezdjük!
1. lépés: GitHub Fork
A fork létrehozásához:
Nyisd meg a böngészőben: https://github.com/danny-avila/LibreChat
Kattints a "Fork" gombra (jobb felső sarok)
Repository name: actionableplus-chat
Kattints "Create fork"
Ha kész van a fork, add meg a GitHub felhasználóneved, és klónozzuk a repot ide a /Users/kolbert/Dev/actionableplus-chat mappába!
AskUserQuestion
OUT
User has answered your questions: "Mi a GitHub felhasználóneved? (A fork URL-hez kell: github.com/USERNAME/actionableplus-chat)"="https://github.com/kolbertistvan2". You can now continue with the user's answers in mind.
Megvan! Klónozzuk a repot.
Bash Clone LibreChat fork from GitHub
IN
cd /Users/kolbert/Dev && git clone https://github.com/kolbertistvan2/actionableplus-chat.git

OUT
Exit code 128
fatal: destination path 'actionableplus-chat' already exists and is not an empty directory.
A mappa már létezik. Nézzük meg mi van benne:
Bash Check existing directory contents
IN
ls -la /Users/kolbert/Dev/actionableplus-chat

OUT
total 0
drwxr-xr-x   3 kolbert  staff   96 Dec 26 20:20 .
drwxr-xr-x  30 kolbert  staff  960 Dec 26 20:11 ..
drwx------@  3 kolbert  staff   96 Dec 26 20:20 .claude
A mappa majdnem üres (csak a .claude config van benne). Klónozzuk a fork-ot ide:
Bash Clone fork into existing directory
IN
git clone https://github.com/kolbertistvan2/actionableplus-chat.git temp_clone && mv temp_clone/* temp_clone/.* . 2>/dev/null; rm -rf temp_clone

OUT
Cloning into 'temp_clone'...
remote: Repository not found.
fatal: repository 'https://github.com/kolbertistvan2/actionableplus-chat.git/' not found
Úgy tűnik még nincs létrehozva a fork. Ellenőrizzük mi van a GitHub fiókodon:
AskUserQuestion
OUT
User has answered your questions: "Létrehoztad már a fork-ot a GitHub-on? Ha nem, kövesd ezeket a lépéseket:

1. Menj ide: https://github.com/danny-avila/LibreChat
2. Kattints a 'Fork' gombra (jobb felső sarok)
3. Repository name: actionableplus-chat
4. Kattints 'Create fork'

Ha kész, válaszd a 'Kész' opciót!"="https://github.com/kolbertistvan2/actionableplus". You can now continue with the user's answers in mind.
A fork neve actionableplus (nem actionableplus-chat). Klónozzuk!