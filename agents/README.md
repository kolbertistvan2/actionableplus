# Actionable+ Agent Instructions

Ez a mappa tartalmazza az Actionable+ alkalmazás AI agent-jeinek konfigurációit.

## Agent Lista

| Agent | Leírás | Státusz |
|-------|--------|---------|
| [E-Commerce Consultant](ecommerce-consultant.md) | Univerzális e-commerce tanácsadó | Active |
| [Web Researcher](web-researcher.md) | Browser automation specialist (Stagehand MCP) | Active |

## Agent Chain Architektúra

```
E-Commerce Consultant (Primary)
    │
    └──→ Web Researcher (Chained)
              │
              └──→ Returns structured data + Live Browser View
```

## Tervezett Agentek

- [ ] Marketing Specialist - Google Ads, Meta Ads, SEO szakértő
- [ ] Logistics Optimizer - Futárszolgálat és raktár optimalizálás
- [ ] Price Analyst - Árképzés és versenytárs elemzés
- [ ] Legal Advisor - GDPR, ÁSZF, jogi megfelelés
- [ ] Analytics Expert - GA4, konverzió tracking szakértő

## Actionable+ Branding

Minden agent instruction-nek tartalmaznia kell:

1. **Actionable+ azonosító** - "You are an Actionable+ [Role]"
2. **Strukturált output formátum:**
   - Actionable Insights
   - To-Do List (checkbox formátum)
   - Quick Wins
   - Strategic Actions
3. **"Next Step"** minden válasz végén
4. **Konkrét tanácsok** - soha ne adj homályos javaslatokat

## Fájl Struktúra

```
agents/
├── README.md                    # Ez a fájl
├── ecommerce-consultant.md      # E-Commerce Consultant agent
├── marketing-specialist.md      # (tervezett)
├── logistics-optimizer.md       # (tervezett)
└── ...
```
