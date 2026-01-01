# Claude Skills Usage Guide

Add this section to any Agent's system instructions to enable document generation capabilities.

---

## CLAUDE SKILLS - DOCUMENT GENERATION

You have access to Claude Skills via MCP tools for generating professional documents and files.

### Available Skills

| Tool | Output | Use When |
|------|--------|----------|
| `create_excel` | .xlsx | Spreadsheets, data analysis, financial models, reports with formulas/charts |
| `create_presentation` | .pptx | Pitch decks, sales presentations, training materials, reports |
| `create_document` | .docx | Proposals, contracts, reports, guides, documentation |
| `create_pdf` | .pdf | Formal reports, invoices, certificates, printable documents |
| `create_frontend_design` | HTML/CSS/JS | Landing pages, UI mockups, interactive prototypes |
| `create_algorithmic_art` | p5.js | Generative art, data visualizations, creative coding |
| `create_canvas_design` | HTML Canvas | Graphics, diagrams, visual layouts |
| `create_theme` | CSS/Design tokens | Color palettes, design systems, brand themes |
| `build_mcp_server` | TypeScript | MCP server development |
| `create_skill` | Skill definition | New Claude Skills |
| `build_web_artifact` | HTML/JS | Interactive web components |
| `test_webapp` | Test results | Web application testing |
| `create_brand_guidelines` | PDF/Doc | Brand identity guides, style guides |
| `coauthor_document` | .docx | Collaborative document editing |
| `create_internal_comms` | Various | Company announcements, newsletters |
| `create_slack_gif` | .gif | Animated GIFs for team communication |

### When to Use Skills

**USE SKILLS when the user asks for:**
- "Create an Excel report of..."
- "Make a PowerPoint presentation about..."
- "Generate a PDF document..."
- "Design a landing page for..."
- "Export this as a Word document..."
- Any request for downloadable/shareable files

**DO NOT USE SKILLS for:**
- Simple text responses
- Artifacts displayed in chat (use React artifacts instead)
- Quick calculations or analyses (just respond in text)

### How to Call Skills

Each skill takes a single `prompt` parameter with detailed instructions:

```
Tool: create_excel
Prompt: "Create a monthly sales report for Q4 2025 with:
- Sheet 1: Revenue by product category (columns: Product, Oct, Nov, Dec, Total)
- Sheet 2: Pie chart of category distribution
- Sheet 3: YoY comparison with previous year
- Include SUM formulas and conditional formatting for negative growth"
```

### Best Practices

1. **Be specific** - Include all requirements in the prompt (columns, sections, formatting)
2. **Specify structure** - For Excel: sheets, columns, formulas. For PPT: slide count, sections
3. **Include data** - Provide actual data or ask skill to generate realistic sample data
4. **Mention language** - If user communicates in Hungarian, specify "in Hungarian" in prompt

### Example Prompts

**Excel:**
```
"Create a product inventory spreadsheet with columns: SKU, Name, Category, Stock, Reorder Point, Status. Add conditional formatting: red if Stock < Reorder Point. Include a pivot table summarizing stock by category."
```

**PowerPoint:**
```
"Create a 10-slide pitch deck for an e-commerce startup:
1. Title slide
2. Problem statement
3. Solution overview
4. Market size
5. Business model
6. Traction/metrics
7. Competition
8. Team
9. Financial projections
10. Ask/CTA
Use professional blue color scheme."
```

**Word Document:**
```
"Create a consulting proposal document with:
- Cover page with company logo placeholder
- Executive summary
- Scope of work (5 deliverables)
- Timeline (Gantt-style table)
- Pricing table
- Terms and conditions
- Signature section"
```

**PDF Report:**
```
"Generate a CRO audit report PDF with:
- Executive summary
- Methodology section
- Findings by page type (Home, Category, Product, Cart, Checkout)
- Prioritized recommendations table
- Implementation roadmap
- Appendix with checklist scores"
```

### Output Format

Skills return results in LibreChat-compatible formats:

| Skill Type | Output | Display |
|-----------|--------|---------|
| **Document skills** (xlsx, pptx, docx, pdf) | HTML artifact with base64 download | Download button in artifact panel |
| **Design skills** (frontend-design, algorithmic-art) | HTML/Canvas artifact | Rendered preview in artifact panel |
| **Web artifacts** (web-artifacts-builder) | HTML bundle | Interactive preview |

**Important Notes:**
- Document files (Excel, Word, etc.) are embedded as base64 in an HTML download page
- Users click the Download button in the artifact panel to save the file
- Large files (>5MB) may take longer to generate and display
- Design/frontend skills render directly as interactive previews

### When to Use Skills vs Native Artifacts

| Need | Use |
|------|-----|
| Downloadable Excel/Word/PDF file | Claude Skills (`create_excel`, etc.) |
| Interactive React dashboard in chat | Native artifact (`application/vnd.react`) |
| Quick chart or visualization | Native artifact (Recharts in React) |
| Formal document for client delivery | Claude Skills |
| Prototype UI for feedback | Either - Skills for polish, native for speed |

**Rule of thumb:**
- Need a **file to download/share**? → Use Skills
- Need **interactive preview in chat**? → Use native artifacts
- Need **both**? → Create native artifact first, then use Skills for export

---

## COPY THIS TO YOUR AGENT

Add the following to your agent's System Instructions:

```
## DOCUMENT GENERATION

When users request exportable documents (Excel, PowerPoint, Word, PDF), use the Claude Skills MCP tools:

- `create_excel` - Spreadsheets with formulas and charts
- `create_presentation` - PowerPoint presentations
- `create_document` - Word documents
- `create_pdf` - PDF reports

Provide a detailed prompt describing the exact structure, content, and formatting needed.
```
