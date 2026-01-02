import { useCallback, useState } from 'react';
import { cleanArtifactContent } from '~/components/Artifacts/Code';
import { loadJsPDF, loadXLSX, loadDocx, loadPptxGenJS } from '~/utils/cdnLibraries';

export type ExportFormat = 'txt' | 'pdf' | 'xlsx' | 'csv' | 'docx' | 'pptx';
export type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

// Actionable+ brand colors
const BRAND = {
  primary: [59, 130, 246] as const, // Blue
  secondary: [99, 102, 241] as const, // Indigo
  text: [30, 41, 59] as const, // Slate-800
  lightBg: [248, 250, 252] as const, // Slate-50
  border: [226, 232, 240] as const, // Slate-200
};

function sanitizeForFilename(str: string): string {
  return (
    str
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .toLowerCase() || 'export'
  );
}

function generateFilename(title: string, ext: string): string {
  const sanitized = sanitizeForFilename(title);
  const timestamp = Math.floor(Date.now() / 1000);
  return `${sanitized}-actionable-${timestamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Content type detection
type ContentType = 'table' | 'code' | 'markdown' | 'text' | 'react-dashboard' | 'presentation';

interface ExtractedDataset {
  name: string;
  data: Record<string, unknown>[];
  columns: string[];
}

interface ParsedReactContent {
  title: string;
  subtitle?: string;
  datasets: ExtractedDataset[];
  metrics: { label: string; value: string }[];
  comments: string[];
}

interface ParsedContent {
  type: ContentType;
  rows: string[][];
  text: string;
  headings: { level: number; text: string; lineIndex: number }[];
  listItems: { text: string; lineIndex: number }[];
  reactData?: ParsedReactContent;
}

/**
 * Check if content is a React dashboard/chart component
 */
function isReactDashboard(content: string, artifactType?: string): boolean {
  // Check artifact type
  if (artifactType?.includes('react')) {
    // Look for dashboard/chart indicators
    const dashboardIndicators = [
      /recharts/i,
      /BarChart|LineChart|PieChart|AreaChart/,
      /Dashboard/i,
      /Chart/i,
      /const\s+\w+Data\s*=/,
      /const\s+\w+\s*=\s*\[\s*\{/,
    ];
    return dashboardIndicators.some((pattern) => pattern.test(content));
  }
  return false;
}

/**
 * Extract data from React dashboard code
 * Handles various code structures and formats
 */
function parseReactDashboard(content: string): ParsedReactContent {
  const result: ParsedReactContent = {
    title: '',
    subtitle: '',
    datasets: [],
    metrics: [],
    comments: [],
  };

  // Extract title from component name (various patterns)
  const componentPatterns = [
    /export\s+(?:default\s+)?function\s+(\w+)/,
    /const\s+(\w+)\s*=\s*(?:\([^)]*\)|)\s*=>/,
    /const\s+(\w+Dashboard|\w+Chart|\w+Report|\w+Analytics)\s*=/,
    /function\s+(\w+)\s*\(/,
  ];

  for (const pattern of componentPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Convert camelCase/PascalCase to readable title
      result.title = match[1]
        .replace(/([A-Z])/g, ' $1')
        .replace(/^\s/, '')
        .trim();
      break;
    }
  }

  // Extract title from JSX h1/h2/h3 or CardTitle
  const jsxTitleMatch = content.match(/<(?:h1|h2|h3|CardTitle)[^>]*>([^<]+)</);
  if (jsxTitleMatch) {
    result.title = jsxTitleMatch[1].trim();
  }

  // Extract subtitle from JSX
  const subtitleMatch = content.match(/<(?:p|CardDescription|span)[^>]*className[^>]*text-(?:gray|muted)[^>]*>([^<]+)</);
  if (subtitleMatch) {
    result.subtitle = subtitleMatch[1].trim();
  }

  // Extract comments (section headers) - filter out noise
  const commentMatches = content.matchAll(/\/\/\s*(.+)/g);
  for (const match of commentMatches) {
    const comment = match[1].trim();
    // Only include meaningful comments (Hungarian or descriptive)
    if (
      comment.length > 5 &&
      !comment.includes('eslint') &&
      !comment.includes('@ts') &&
      !comment.includes('TODO') &&
      !comment.includes('FIXME') &&
      !comment.startsWith('import') &&
      !/^[a-z]+$/.test(comment) // Skip single lowercase words
    ) {
      result.comments.push(comment);
    }
  }

  // Normalize content: convert tabs to spaces for consistent parsing
  const normalizedContent = content.replace(/\t/g, '  ');

  // Extract const arrays (datasets) - improved pattern
  // Matches: const name = [ ... ]; with proper bracket balancing
  const lines = normalizedContent.split('\n');
  let inArray = false;
  let currentVarName = '';
  let arrayContent = '';
  let bracketDepth = 0;

  for (const line of lines) {
    // Start of array declaration - handles tabs and various spacing
    const arrayStart = line.match(/^[\s\t]*const\s+(\w+)\s*=\s*\[/);
    if (arrayStart && !inArray) {
      inArray = true;
      currentVarName = arrayStart[1];
      arrayContent = line;
      bracketDepth = (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      continue;
    }

    if (inArray) {
      arrayContent += '\n' + line;
      bracketDepth += (line.match(/\[/g) || []).length;
      bracketDepth -= (line.match(/\]/g) || []).length;

      // End of array
      if (bracketDepth <= 0) {
        inArray = false;

        // Parse the collected array
        const dataset = parseArrayContent(currentVarName, arrayContent);
        if (dataset && dataset.data.length > 0) {
          result.datasets.push(dataset);
        }

        currentVarName = '';
        arrayContent = '';
      }
    }
  }

  // Extract KPI/metric values from JSX structure
  const kpiPatterns = [
    /<CardTitle[^>]*>([^<]*\$?[\d,.]+[MBK%]?[^<]*)</g,
    /<Badge[^>]*>([^<]+)</g,
    />\s*([\d,.]+%?\s*(?:CAGR|növekedés|growth|increase))\s*</gi,
    />\s*~?([\d,.]+)\s*(Mrd|M|B|ezer|Ft|db|fő)\s*</g,
  ];

  for (const pattern of kpiPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const label = (match[1] || '').trim();
      if (label && label.length < 50) {
        result.metrics.push({
          label,
          value: match[2] || '',
        });
      }
    }
  }

  return result;
}

/**
 * Parse array content and extract structured data
 */
function parseArrayContent(varName: string, arrayContent: string): ExtractedDataset | null {
  try {
    // Extract objects from array using balanced bracket matching
    const objects: Record<string, unknown>[] = [];
    const columnsSet = new Set<string>();

    // Find all top-level objects in the array
    let depth = 0;
    let objectStart = -1;

    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];

      if (char === '{') {
        if (depth === 0) {
          objectStart = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && objectStart !== -1) {
          const objectStr = arrayContent.substring(objectStart + 1, i);
          const obj = parseObjectContent(objectStr);

          if (Object.keys(obj).length > 0) {
            objects.push(obj);
            Object.keys(obj).forEach((key) => columnsSet.add(key));
          }
          objectStart = -1;
        }
      }
    }

    if (objects.length === 0) {
      return null;
    }

    // Create readable dataset name
    const name = varName
      .replace(/Data$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();

    return {
      name,
      data: objects,
      columns: Array.from(columnsSet),
    };
  } catch {
    return null;
  }
}

/**
 * Parse object content string into key-value pairs
 * Handles: strings, numbers, booleans, tabs, and various spacing
 */
function parseObjectContent(objectStr: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  // Normalize: replace tabs with spaces
  const normalized = objectStr.replace(/\t/g, ' ');

  // Match key-value pairs with various value types
  // Uses [\s\t]* to handle any whitespace including tabs
  const patterns = [
    // String values (single or double quotes)
    /(\w+)[\s\t]*:[\s\t]*'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    /(\w+)[\s\t]*:[\s\t]*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    // Template literals (simplified - just extract the text)
    /(\w+)[\s\t]*:[\s\t]*`([^`]*)`/g,
    // Numbers (including negative and decimals) - must come before simple identifiers
    /(\w+)[\s\t]*:[\s\t]*(-?\d+(?:\.\d+)?)\b/g,
    // Booleans
    /(\w+)[\s\t]*:[\s\t]*(true|false)\b/g,
    // Hex colors (like #3b82f6)
    /(\w+)[\s\t]*:[\s\t]*'(#[0-9a-fA-F]{3,8})'/g,
    /(\w+)[\s\t]*:[\s\t]*"(#[0-9a-fA-F]{3,8})"/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(normalized)) !== null) {
      const key = match[1];
      let value: unknown = match[2];

      // Type conversion for display
      if (value === 'true') {
        value = '✓';
      } else if (value === 'false') {
        value = '✗';
      } else if (/^-?\d+(?:\.\d+)?$/.test(value as string)) {
        // Format numbers for Hungarian locale display
        const num = parseFloat(value as string);
        if (!isNaN(num)) {
          // Keep original if it looks like a year (2020-2099) or small integer
          if (num >= 2000 && num <= 2099) {
            value = String(num);
          } else if (Number.isInteger(num) && num >= 0 && num <= 100) {
            value = String(num);
          } else {
            value = num.toLocaleString('hu-HU');
          }
        }
      }

      // Don't overwrite existing values (first match wins)
      if (!(key in obj)) {
        obj[key] = value;
      }
    }
  }

  return obj;
}

/**
 * Get content type from artifact MIME type
 * Returns explicit type if known, null if detection needed
 */
function getContentTypeFromArtifact(artifactType?: string): ContentType | null {
  if (!artifactType) return null;

  // Explicit text types
  if (artifactType === 'text/markdown' || artifactType === 'text/md') return 'markdown';
  if (artifactType === 'text/csv') return 'table';
  if (artifactType === 'text/plain') return 'text';

  // HTML and React types need content-based detection
  // (could be presentation, dashboard, form, etc.)
  if (artifactType.includes('html') || artifactType.includes('react')) {
    return null; // Let parseContent() detect the actual type
  }

  // Other code types - always treat as code
  if (
    artifactType.includes('code') ||
    artifactType.includes('javascript') ||
    artifactType.includes('typescript') ||
    artifactType.includes('json') ||
    artifactType.includes('css') ||
    artifactType.includes('python') ||
    artifactType.includes('java') ||
    artifactType === 'application/vnd.ant.code'
  ) {
    return 'code';
  }

  return null; // Detection needed
}

/**
 * Detect if HTML/React content is a presentation (slide deck)
 * Looks for common presentation patterns
 */
function isPresentationContent(content: string): boolean {
  const presentationIndicators = [
    /class\s*=\s*["'][^"']*slide[^"']*["']/i, // class="slide" or class="slide-..."
    /class\s*=\s*["'][^"']*presentation[^"']*["']/i, // class="presentation"
    /page-break-after\s*:\s*always/i, // CSS for page breaks
    /function\s+(downloadPDF|exportToPDF|exportPresentation)\s*\(/i, // Built-in export
    /html2pdf/i, // html2pdf.js library
    /slide-content|slide-header|slide-body|slide-footer/i, // Common slide classes
    /slide-number|slide-title/i, // Slide number/title classes
  ];

  // Require at least 2 indicators for confident detection
  let matchCount = 0;
  for (const pattern of presentationIndicators) {
    if (pattern.test(content)) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }

  // Also detect if there are multiple "slide" divs
  const slideMatches = content.match(/<div[^>]*class\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*>/gi);
  if (slideMatches && slideMatches.length >= 3) {
    return true;
  }

  return false;
}

interface ExtractedSlide {
  title: string;
  bullets: string[];
}

/**
 * Extract slides from HTML presentation content
 * Parses slide divs and extracts titles and bullet points
 */
function extractSlidesFromHTML(html: string): ExtractedSlide[] {
  const slides: ExtractedSlide[] = [];

  // Find all slide divs - capture content between them
  // Using a simpler approach: split by slide class divs
  const slideRegex = /<div[^>]*class\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]*class\s*=\s*["'][^"']*\bslide\b|$)/gi;

  let match;
  while ((match = slideRegex.exec(html)) !== null) {
    const slideContent = match[1] || '';

    // Extract title from various patterns
    let title = '';

    // Try slide-title class
    const slideTitleMatch = slideContent.match(/<[^>]*class\s*=\s*["'][^"']*slide-title[^"']*["'][^>]*>([^<]+)/i);
    if (slideTitleMatch) {
      title = slideTitleMatch[1].trim();
    }

    // Try h2 tag
    if (!title) {
      const h2Match = slideContent.match(/<h2[^>]*>([^<]+)/i);
      if (h2Match) {
        title = h2Match[1].trim();
      }
    }

    // Try cover-title class
    if (!title) {
      const coverTitleMatch = slideContent.match(/<[^>]*class\s*=\s*["'][^"']*cover-title[^"']*["'][^>]*>([^<]+)/i);
      if (coverTitleMatch) {
        title = coverTitleMatch[1].trim();
      }
    }

    // Extract bullets from li elements
    const bullets: string[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(slideContent)) !== null) {
      // Clean HTML tags from the li content
      let bulletText = liMatch[1]
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      if (bulletText && bulletText.length > 0 && bulletText.length < 500) {
        bullets.push(bulletText);
      }
    }

    // Also extract text from stat-card, kpi-section, etc.
    const valueRegex = /<[^>]*class\s*=\s*["'][^"']*(?:value|stat-card|kpi)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
    let valueMatch;
    while ((valueMatch = valueRegex.exec(slideContent)) !== null) {
      const valueText = valueMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (valueText && valueText.length > 0 && valueText.length < 200 && !bullets.includes(valueText)) {
        bullets.push(valueText);
      }
    }

    // Only add slides with some content
    if (title || bullets.length > 0) {
      slides.push({ title, bullets: bullets.slice(0, 10) }); // Limit bullets per slide
    }
  }

  return slides;
}

/**
 * Detect if content is code with stricter threshold
 * Requires 20% of lines to match code patterns OR full file structure
 */
function isCodeContent(content: string): boolean {
  const lines = content.trim().split('\n');

  // Full file indicators - if starts with these, it's definitely code
  const firstLine = lines[0]?.trim() || '';
  if (/^import\s+/.test(firstLine) || /^<!DOCTYPE/i.test(firstLine) || /^<\?xml/i.test(firstLine)) {
    return true;
  }

  // Line-by-line code pattern detection
  const codePatterns = [
    /^import\s+.*from\s+['"`]/, // import X from 'Y'
    /^export\s+(default\s+)?/, // export / export default
    /^(const|let|var)\s+\w+\s*=/, // variable declarations
    /^function\s+\w+\s*\(/, // function declarations
    /^class\s+\w+/, // class declarations
    /^\s*return\s+/, // return statements
    /^<\w+(\s|>|\/)/, // JSX opening tags (start of line only)
    /^\s*\}\s*$/, // closing braces alone
    /^\s*\)\s*;?\s*$/, // closing parens
    /^\s*if\s*\(/, // if statements
    /^\s*for\s*\(/, // for loops
    /^\s*while\s*\(/, // while loops
    /^@\w+/, // decorators
    /^\s*\/\//, // single line comments
    /^\s*\/\*/, // multi-line comment start
    /^\s*\*/, // multi-line comment continuation
    /@import\s+/, // CSS imports
    /\.\w+\s*\{/, // CSS selectors
    /^\s*\w+:\s*\w+;/, // CSS properties
  ];

  let codeLines = 0;

  for (const line of lines) {
    if (line.trim() === '') continue; // Skip empty lines for counting
    if (codePatterns.some((p) => p.test(line))) {
      codeLines++;
    }
  }

  const nonEmptyLines = lines.filter((l) => l.trim() !== '').length;

  // Code if: 20%+ code lines RATIO
  return nonEmptyLines > 0 && codeLines / nonEmptyLines >= 0.2;
}

// Detect if content is markdown
function isMarkdownContent(content: string): boolean {
  const lines = content.trim().split('\n');
  let markdownFeatures = 0;

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) markdownFeatures++; // Headings
    if (/^\s*[-*+]\s+/.test(line)) markdownFeatures++; // Lists
    if (/^\s*\d+\.\s+/.test(line)) markdownFeatures++; // Numbered lists
    if (/\*\*[^*]+\*\*/.test(line)) markdownFeatures++; // Bold
    if (/\*[^*]+\*/.test(line)) markdownFeatures++; // Italic
    if (/\[.+\]\(.+\)/.test(line)) markdownFeatures++; // Links
  }

  return markdownFeatures >= 3;
}

/**
 * Parse a CSV line properly handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detect if content is a table (markdown or CSV)
 * Returns parsed rows for consistent handling
 */
function isTableContent(content: string): { isTable: boolean; delimiter: string; rows: string[][] } {
  const lines = content.trim().split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    return { isTable: false, delimiter: '', rows: [] };
  }

  // Check for markdown table: | at start AND end of lines
  const markdownTableLines = lines.filter((l) => /^\|.*\|$/.test(l.trim()));
  if (markdownTableLines.length >= 3) {
    // Check for separator row: |---|---|
    const hasSeparator = markdownTableLines.some((l) => /^\|[-:\s|]+\|$/.test(l.trim()));
    if (hasSeparator) {
      const rows = markdownTableLines
        .filter((l) => !/^[-:\s|]+$/.test(l.replace(/\|/g, '').trim())) // Filter separator lines
        .map((l) =>
          l
            .split('|')
            .slice(1, -1) // Remove first and last empty elements from split
            .map((c) => c.trim()), // Keep empty cells!
        );
      return { isTable: true, delimiter: '|', rows };
    }
  }

  // Check for CSV: consistent comma count, at least 2 columns
  const commaMatches = lines.map((l) => (l.match(/,/g) || []).length);
  if (commaMatches.length >= 2) {
    const firstCount = commaMatches[0];
    // All lines should have the same number of commas (±1 for last line)
    const allConsistent = commaMatches.every((c) => Math.abs(c - firstCount) <= 1) && firstCount >= 1;
    if (allConsistent) {
      const rows = lines.map((l) => parseCSVLine(l)); // Proper CSV parsing
      return { isTable: true, delimiter: ',', rows };
    }
  }

  // Check for tab-separated
  const tabMatches = lines.map((l) => (l.match(/\t/g) || []).length);
  if (tabMatches.length >= 2) {
    const firstCount = tabMatches[0];
    const allConsistent = tabMatches.every((c) => c === firstCount) && firstCount >= 1;
    if (allConsistent) {
      const rows = lines.map((l) => l.split('\t').map((c) => c.trim()));
      return { isTable: true, delimiter: '\t', rows };
    }
  }

  return { isTable: false, delimiter: '', rows: [] };
}

// Parse markdown content for structure
function parseMarkdownStructure(
  content: string,
): Pick<ParsedContent, 'headings' | 'listItems'> {
  const lines = content.split('\n');
  const headings: ParsedContent['headings'] = [];
  const listItems: ParsedContent['listItems'] = [];

  lines.forEach((line, index) => {
    // Detect headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
        lineIndex: index,
      });
    }

    // Detect list items
    const listMatch = line.match(/^\s*[-*+]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
    if (listMatch) {
      listItems.push({
        text: listMatch[1],
        lineIndex: index,
      });
    }
  });

  return { headings, listItems };
}

/**
 * Parse content - detect type and extract structured data
 * @param content - The raw content string
 * @param artifactType - Optional artifact MIME type for pre-filtering
 */
function parseContent(content: string, artifactType?: string): ParsedContent {
  const cleaned = cleanArtifactContent(content);

  // Special case: React dashboards/charts should be parsed for data, not shown as code
  if (isReactDashboard(cleaned, artifactType)) {
    const reactData = parseReactDashboard(cleaned);
    return {
      type: 'react-dashboard',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
      reactData,
    };
  }

  // Special case: HTML/React presentations (slide decks)
  // Check BEFORE code detection to avoid treating presentations as code
  if (isPresentationContent(cleaned)) {
    return {
      type: 'presentation',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // First: try to get explicit type from artifact.type
  const explicitType = getContentTypeFromArtifact(artifactType);

  if (explicitType === 'code') {
    return {
      type: 'code',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  if (explicitType === 'table') {
    // Even with explicit table type, try to parse the rows
    const tableCheck = isTableContent(cleaned);
    return {
      type: 'table',
      rows: tableCheck.rows,
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  if (explicitType === 'markdown') {
    const { headings, listItems } = parseMarkdownStructure(cleaned);
    return {
      type: 'markdown',
      rows: [],
      text: cleaned,
      headings,
      listItems,
    };
  }

  if (explicitType === 'text') {
    return {
      type: 'text',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // Fallback: content-based detection

  // Check for code first (highest priority to avoid wrong detection)
  if (isCodeContent(cleaned)) {
    return {
      type: 'code',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // Check for table - now returns rows directly
  const tableCheck = isTableContent(cleaned);
  if (tableCheck.isTable) {
    return {
      type: 'table',
      rows: tableCheck.rows, // Use pre-parsed rows
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // Check for markdown
  if (isMarkdownContent(cleaned)) {
    const { headings, listItems } = parseMarkdownStructure(cleaned);
    return {
      type: 'markdown',
      rows: [],
      text: cleaned,
      headings,
      listItems,
    };
  }

  // Default to plain text
  return {
    type: 'text',
    rows: [],
    text: cleaned,
    headings: [],
    listItems: [],
  };
}

/**
 * Get recommended export formats based on content type
 */
function getRecommendedFormats(contentType: ContentType): ExportFormat[] {
  switch (contentType) {
    case 'table':
      return ['xlsx', 'csv', 'pdf'];
    case 'code':
      return ['txt'];
    case 'markdown':
      return ['pdf', 'docx', 'pptx'];
    case 'react-dashboard':
      return ['pdf', 'xlsx', 'pptx']; // Dashboard data exports
    case 'presentation':
      return ['pdf', 'pptx']; // Presentation exports - PDF (built-in) preferred
    default:
      return ['txt', 'pdf'];
  }
}

export function useArtifactExport() {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const exportToTxt = useCallback((content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateFilename(title, 'txt');
    const blob = new Blob([cleaned], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
  }, []);

  const exportToCsv = useCallback((content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateFilename(title, 'csv');
    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + cleaned], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, filename);
  }, []);

  const exportToPdf = useCallback(async (content: string, title: string, artifactType?: string) => {
    setStatus('loading');
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF();
      const parsed = parseContent(content, artifactType);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      // Helper to check page break
      const checkPageBreak = (_requiredSpace: number = 20) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
      };

      // === HEADER ===
      doc.setFillColor(...BRAND.primary);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Actionable+', margin, 16);
      doc.setFontSize(10);
      doc.text('E-Commerce Consulting', pageWidth - margin - 45, 16);

      y = 35;

      // === TITLE ===
      doc.setTextColor(...BRAND.text);
      doc.setFontSize(20);
      const titleLines = doc.splitTextToSize(title || 'Export', pageWidth - margin * 2);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 5;

      // Date
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        new Date().toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        margin,
        y,
      );
      y += 12;

      // Separator line
      doc.setDrawColor(...BRAND.border);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // === CONTENT based on type ===
      doc.setTextColor(...BRAND.text);

      switch (parsed.type) {
        case 'table': {
          // Professional table rendering
          const { rows } = parsed;
          if (rows.length === 0) break;

          const numCols = Math.max(...rows.map((r) => r.length));
          const tableWidth = pageWidth - margin * 2;
          const colWidth = tableWidth / numCols;
          const rowHeight = 8;

          rows.forEach((row, rowIdx) => {
            checkPageBreak(rowHeight + 5);

            const isHeader = rowIdx === 0;

            // Background for header row
            if (isHeader) {
              doc.setFillColor(...BRAND.primary);
              doc.rect(margin, y - 5, tableWidth, rowHeight + 2, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(10);
            } else {
              // Alternating row colors
              if (rowIdx % 2 === 0) {
                doc.setFillColor(...BRAND.lightBg);
                doc.rect(margin, y - 5, tableWidth, rowHeight + 2, 'F');
              }
              doc.setTextColor(...BRAND.text);
              doc.setFontSize(9);
            }

            // Cell borders
            doc.setDrawColor(...BRAND.border);
            doc.setLineWidth(0.2);
            doc.rect(margin, y - 5, tableWidth, rowHeight + 2);

            // Cell content
            row.forEach((cell, colIdx) => {
              const x = margin + colIdx * colWidth + 2;
              const cellText = cell.length > 25 ? cell.substring(0, 22) + '...' : cell;
              doc.text(cellText, x, y);
            });

            y += rowHeight + 2;
          });
          break;
        }

        case 'code': {
          // Code block with monospace styling
          doc.setFillColor(245, 245, 245);
          const codeLines = parsed.text.split('\n');
          const codeBlockHeight = Math.min(codeLines.length * 5 + 10, pageHeight - y - 40);

          doc.rect(margin, y - 3, pageWidth - margin * 2, codeBlockHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 3, pageWidth - margin * 2, codeBlockHeight);

          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);

          let codeY = y + 5;
          codeLines.forEach((line, idx) => {
            if (codeY > pageHeight - 40) {
              doc.addPage();
              codeY = margin + 5;
              // Redraw code background on new page
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, margin - 3, pageWidth - margin * 2, pageHeight - margin * 2 - 20, 'F');
            }

            // Line number
            doc.setTextColor(150, 150, 150);
            doc.text(String(idx + 1).padStart(3, ' '), margin + 3, codeY);

            // Code content
            doc.setTextColor(60, 60, 60);
            const codeLine = line.substring(0, 80); // Truncate long lines
            doc.text(codeLine, margin + 18, codeY);

            codeY += 5;
          });

          y = codeY + 5;
          break;
        }

        case 'markdown': {
          // Rich markdown rendering
          const lines = parsed.text.split('\n');

          lines.forEach((line) => {
            checkPageBreak(12);

            // Heading detection
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);
            const h3Match = line.match(/^###\s+(.+)$/);
            const listMatch = line.match(/^\s*[-*+]\s+(.+)$/);
            const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

            if (h1Match) {
              doc.setFontSize(16);
              doc.setTextColor(...BRAND.primary);
              y += 5;
              doc.text(h1Match[1], margin, y);
              y += 10;
            } else if (h2Match) {
              doc.setFontSize(14);
              doc.setTextColor(...BRAND.secondary);
              y += 4;
              doc.text(h2Match[1], margin, y);
              y += 8;
            } else if (h3Match) {
              doc.setFontSize(12);
              doc.setTextColor(...BRAND.text);
              y += 3;
              doc.text(h3Match[1], margin, y);
              y += 7;
            } else if (listMatch) {
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              doc.text('•', margin + 5, y);
              const listText = doc.splitTextToSize(listMatch[1], pageWidth - margin * 2 - 15);
              doc.text(listText, margin + 12, y);
              y += listText.length * 5 + 2;
            } else if (numberedMatch) {
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              doc.text(`${numberedMatch[1]}.`, margin + 3, y);
              const listText = doc.splitTextToSize(numberedMatch[2], pageWidth - margin * 2 - 15);
              doc.text(listText, margin + 12, y);
              y += listText.length * 5 + 2;
            } else if (line.trim() === '') {
              y += 4;
            } else {
              // Regular paragraph - handle bold and italic
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              let processedLine = line.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markers
              processedLine = processedLine.replace(/\*([^*]+)\*/g, '$1'); // Remove italic markers
              const wrappedLines = doc.splitTextToSize(processedLine, pageWidth - margin * 2);
              doc.text(wrappedLines, margin, y);
              y += wrappedLines.length * 5 + 2;
            }
          });
          break;
        }

        case 'react-dashboard': {
          // Professional dashboard data rendering
          const { reactData } = parsed;
          if (!reactData) break;

          // Render section headers from comments
          if (reactData.comments.length > 0) {
            doc.setFontSize(11);
            doc.setTextColor(...BRAND.secondary);
            reactData.comments.slice(0, 5).forEach((comment) => {
              checkPageBreak(10);
              doc.text(`• ${comment}`, margin, y);
              y += 6;
            });
            y += 5;
          }

          // Render each dataset as a table
          reactData.datasets.forEach((dataset) => {
            checkPageBreak(30);

            // Dataset title
            doc.setFontSize(14);
            doc.setTextColor(...BRAND.primary);
            const datasetTitle = dataset.name.replace(/([A-Z])/g, ' $1').trim();
            doc.text(datasetTitle, margin, y);
            y += 10;

            if (dataset.data.length === 0 || dataset.columns.length === 0) return;

            const numCols = dataset.columns.length;
            const tableWidth = pageWidth - margin * 2;
            const colWidth = tableWidth / numCols;
            const rowHeight = 7;

            // Header row
            doc.setFillColor(...BRAND.primary);
            doc.rect(margin, y - 4, tableWidth, rowHeight + 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);

            dataset.columns.forEach((col, colIdx) => {
              const x = margin + colIdx * colWidth + 2;
              const headerText = col.replace(/([A-Z])/g, ' $1').trim();
              doc.text(headerText.substring(0, 15), x, y);
            });
            y += rowHeight + 1;

            // Data rows
            dataset.data.slice(0, 20).forEach((row, rowIdx) => {
              checkPageBreak(rowHeight + 2);

              // Alternating row colors
              if (rowIdx % 2 === 0) {
                doc.setFillColor(...BRAND.lightBg);
                doc.rect(margin, y - 4, tableWidth, rowHeight, 'F');
              }

              doc.setTextColor(...BRAND.text);
              doc.setFontSize(8);

              dataset.columns.forEach((col, colIdx) => {
                const x = margin + colIdx * colWidth + 2;
                const cellValue = String(row[col] ?? '');
                doc.text(cellValue.substring(0, 18), x, y);
              });

              y += rowHeight;
            });

            // Border around table
            doc.setDrawColor(...BRAND.border);
            doc.setLineWidth(0.3);
            const tableHeight = (Math.min(dataset.data.length, 20) + 1) * rowHeight + 1;
            doc.rect(margin, y - tableHeight - 4, tableWidth, tableHeight + 4);

            y += 15;
          });

          // Show truncation notice if needed
          const totalRows = reactData.datasets.reduce((sum, ds) => sum + ds.data.length, 0);
          if (totalRows > 20) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Megjegyzés: Az adatok egy része nem került megjelenítésre (${totalRows} sor összesen)`, margin, y);
            y += 10;
          }
          break;
        }

        default: {
          // Plain text - simple paragraph rendering
          doc.setFontSize(11);
          doc.setTextColor(...BRAND.text);

          const paragraphs = parsed.text.split('\n\n');
          paragraphs.forEach((paragraph) => {
            checkPageBreak(15);

            const lines = doc.splitTextToSize(paragraph.replace(/\n/g, ' '), pageWidth - margin * 2);
            doc.text(lines, margin, y);
            y += lines.length * 6 + 8;
          });
        }
      }

      // === FOOTER on all pages ===
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Actionable+ Export • ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 10, {
          align: 'center',
        });
      }

      doc.save(generateFilename(title, 'pdf'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
      setStatus('error');
    }
  }, []);

  const exportToXlsx = useCallback(async (content: string, title: string, artifactType?: string) => {
    setStatus('loading');
    try {
      const XLSX = await loadXLSX();
      const parsed = parseContent(content, artifactType);
      const workbook = XLSX.utils.book_new();

      // Handle react-dashboard with multiple sheets
      if (parsed.type === 'react-dashboard' && parsed.reactData) {
        const { reactData } = parsed;

        // Create a sheet for each dataset
        reactData.datasets.forEach((dataset, idx) => {
          if (dataset.data.length === 0) return;

          // Header row
          const headerRow = dataset.columns.map((col) =>
            col.replace(/([A-Z])/g, ' $1').trim(),
          );

          // Data rows
          const dataRows = dataset.data.map((row) =>
            dataset.columns.map((col) => String(row[col] ?? '')),
          );

          const sheetData = [headerRow, ...dataRows];
          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

          // Column widths
          const colWidths = dataset.columns.map((col) => {
            const maxLen = Math.max(
              col.length,
              ...dataset.data.map((row) => String(row[col] ?? '').length),
            );
            return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
          });
          worksheet['!cols'] = colWidths;

          // Sheet name (max 31 chars for Excel)
          const sheetName = dataset.name.substring(0, 28) || `Adatok ${idx + 1}`;
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        // If no datasets, create summary sheet
        if (reactData.datasets.length === 0) {
          const summaryData = [
            ['Actionable+ Export'],
            [title || 'Dashboard Export'],
            [`Generálva: ${new Date().toLocaleDateString('hu-HU')}`],
            [''],
            ['Nem található táblázatos adat a dashboardban.'],
          ];
          const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Összefoglaló');
        }
      } else {
        // Original logic for other content types
        let data: string[][];

        if (parsed.type === 'table' && parsed.rows.length > 0) {
          data = parsed.rows;
        } else {
          data = parsed.text.split('\n').map((line) => [line]);
        }

        const headerRow = ['Actionable+ Export'];
        const dateRow = [`Generated: ${new Date().toLocaleDateString('hu-HU')}`];
        const titleRow = [title || 'Export'];
        const emptyRow = [''];

        const fullData = [headerRow, dateRow, titleRow, emptyRow, ...data];
        const worksheet = XLSX.utils.aoa_to_sheet(fullData);

        const numCols = Math.max(...fullData.map((row) => row.length));
        const colWidths: number[] = [];

        for (let col = 0; col < numCols; col++) {
          const maxLen = Math.max(...fullData.map((row) => (row[col]?.toString().length || 0)));
          colWidths.push(Math.min(Math.max(maxLen + 2, 10), 50));
        }
        worksheet['!cols'] = colWidths.map((wch) => ({ wch }));

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
      }

      XLSX.writeFile(workbook, generateFilename(title, 'xlsx'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export failed');
      setStatus('error');
    }
  }, []);

  const exportToDocx = useCallback(async (content: string, title: string, artifactType?: string) => {
    setStatus('loading');
    try {
      const docx = await loadDocx();
      const { Document, Paragraph, TextRun, HeadingLevel, Header, Footer, AlignmentType, Packer } =
        docx;
      const parsed = parseContent(content, artifactType);

      // Build content paragraphs based on type
      const buildContentParagraphs = (): unknown[] => {
        const paragraphs: unknown[] = [];

        switch (parsed.type) {
          case 'table': {
            // Render table as formatted text (docx tables require more complex setup)
            parsed.rows.forEach((row, rowIdx) => {
              const isHeader = rowIdx === 0;
              paragraphs.push(
                new Paragraph({
                  children: row.map((cell, cellIdx) =>
                    new TextRun({
                      text: cell + (cellIdx < row.length - 1 ? '  |  ' : ''),
                      bold: isHeader,
                      color: isHeader ? '3B82F6' : '1E293B',
                      size: isHeader ? 24 : 22,
                    }),
                  ),
                  spacing: { after: 120 },
                }),
              );

              // Add separator after header
              if (isHeader) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '─'.repeat(50),
                        color: 'E2E8F0',
                        size: 20,
                      }),
                    ],
                    spacing: { after: 120 },
                  }),
                );
              }
            });
            break;
          }

          case 'markdown': {
            parsed.text.split('\n').forEach((line) => {
              const h1Match = line.match(/^#\s+(.+)$/);
              const h2Match = line.match(/^##\s+(.+)$/);
              const h3Match = line.match(/^###\s+(.+)$/);
              const listMatch = line.match(/^\s*[-*+]\s+(.+)$/);
              const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

              if (h1Match) {
                paragraphs.push(
                  new Paragraph({
                    text: h1Match[1],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                  }),
                );
              } else if (h2Match) {
                paragraphs.push(
                  new Paragraph({
                    text: h2Match[1],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                  }),
                );
              } else if (h3Match) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h3Match[1],
                        bold: true,
                        size: 26,
                        color: '374151',
                      }),
                    ],
                    spacing: { before: 160, after: 80 },
                  }),
                );
              } else if (listMatch) {
                // Clean markdown formatting from list item
                let itemText = listMatch[1];
                itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '$1');
                itemText = itemText.replace(/\*([^*]+)\*/g, '$1');

                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: '•  ', color: '3B82F6' }),
                      new TextRun({ text: itemText, size: 22 }),
                    ],
                    indent: { left: 360 },
                    spacing: { after: 60 },
                  }),
                );
              } else if (numberedMatch) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${numberedMatch[1]}.  `, bold: true, color: '3B82F6' }),
                      new TextRun({ text: numberedMatch[2], size: 22 }),
                    ],
                    indent: { left: 360 },
                    spacing: { after: 60 },
                  }),
                );
              } else if (line.trim()) {
                // Regular paragraph - handle bold and italic
                let processedText = line.replace(/\*\*([^*]+)\*\*/g, '$1');
                processedText = processedText.replace(/\*([^*]+)\*/g, '$1');

                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: processedText, size: 22 })],
                    spacing: { after: 80 },
                  }),
                );
              } else {
                // Empty line
                paragraphs.push(new Paragraph({ text: '' }));
              }
            });
            break;
          }

          case 'code': {
            // Code block with monospace styling
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Kód:',
                    bold: true,
                    size: 24,
                    color: '374151',
                  }),
                ],
                spacing: { after: 120 },
              }),
            );

            parsed.text.split('\n').forEach((line, idx) => {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${String(idx + 1).padStart(3, ' ')}  `,
                      color: '9CA3AF',
                      size: 18,
                      font: 'Courier New',
                    }),
                    new TextRun({
                      text: line,
                      size: 18,
                      font: 'Courier New',
                      color: '1F2937',
                    }),
                  ],
                  shading: { fill: 'F3F4F6' },
                  spacing: { after: 20 },
                }),
              );
            });
            break;
          }

          case 'react-dashboard': {
            // Professional dashboard data rendering for Word
            const { reactData } = parsed;
            if (!reactData) break;

            // Render section headers from comments
            if (reactData.comments.length > 0) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Dashboard összefoglaló',
                      bold: true,
                      size: 28,
                      color: '3B82F6',
                    }),
                  ],
                  spacing: { before: 200, after: 120 },
                }),
              );

              reactData.comments.slice(0, 5).forEach((comment) => {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: '•  ', color: '3B82F6' }),
                      new TextRun({ text: comment, size: 22 }),
                    ],
                    indent: { left: 360 },
                    spacing: { after: 60 },
                  }),
                );
              });
            }

            // Render each dataset
            reactData.datasets.forEach((dataset) => {
              if (dataset.data.length === 0 || dataset.columns.length === 0) return;

              // Dataset section title
              const datasetTitle = dataset.name.replace(/([A-Z])/g, ' $1').trim();
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: datasetTitle,
                      bold: true,
                      size: 26,
                      color: '1E293B',
                    }),
                  ],
                  spacing: { before: 240, after: 120 },
                }),
              );

              // Table header
              paragraphs.push(
                new Paragraph({
                  children: dataset.columns.map((col, colIdx) =>
                    new TextRun({
                      text: col.replace(/([A-Z])/g, ' $1').trim() + (colIdx < dataset.columns.length - 1 ? '  |  ' : ''),
                      bold: true,
                      color: '3B82F6',
                      size: 22,
                    }),
                  ),
                  shading: { fill: 'F8FAFC' },
                  spacing: { after: 80 },
                }),
              );

              // Separator line
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '─'.repeat(60),
                      color: 'E2E8F0',
                      size: 20,
                    }),
                  ],
                  spacing: { after: 60 },
                }),
              );

              // Data rows (limit to 30 rows for Word)
              dataset.data.slice(0, 30).forEach((row, rowIdx) => {
                paragraphs.push(
                  new Paragraph({
                    children: dataset.columns.map((col, colIdx) =>
                      new TextRun({
                        text: String(row[col] ?? '') + (colIdx < dataset.columns.length - 1 ? '  |  ' : ''),
                        size: 20,
                        color: '374151',
                      }),
                    ),
                    shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
                    spacing: { after: 40 },
                  }),
                );
              });

              // Truncation notice
              if (dataset.data.length > 30) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `... és további ${dataset.data.length - 30} sor`,
                        italic: true,
                        color: '94A3B8',
                        size: 18,
                      }),
                    ],
                    spacing: { before: 60, after: 120 },
                  }),
                );
              }
            });
            break;
          }

          default: {
            // Plain text
            parsed.text.split('\n').forEach((line) => {
              if (line.trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 22 })],
                    spacing: { after: 120 },
                  }),
                );
              } else {
                paragraphs.push(new Paragraph({ text: '' }));
              }
            });
          }
        }

        return paragraphs;
      };

      const doc = new Document({
        sections: [
          {
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Actionable+ ',
                        bold: true,
                        color: '3B82F6',
                        size: 24,
                      }),
                      new TextRun({
                        text: '• E-Commerce Consulting',
                        color: '64748B',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'Actionable+ Export',
                        color: '94A3B8',
                        size: 16,
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: [
              new Paragraph({
                text: title || 'Export',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date().toLocaleDateString('hu-HU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                    color: '64748B',
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({ text: '' }), // Empty line
              ...buildContentParagraphs(),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, generateFilename(title, 'docx'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DOCX export failed');
      setStatus('error');
    }
  }, []);

  const exportToPptx = useCallback(async (content: string, title: string, artifactType?: string) => {
    setStatus('loading');
    try {
      const PptxGenJS = await loadPptxGenJS();
      const pptx = new PptxGenJS();

      // Brand colors
      pptx.author = 'Actionable+';
      pptx.company = 'Actionable+ E-Commerce Consulting';
      pptx.title = title || 'Export';

      const parsed = parseContent(content, artifactType);

      // Title slide with gradient background
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Actionable+', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: '3B82F6',
      });
      titleSlide.addText(title || 'Export', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        color: '1E293B',
      });
      titleSlide.addText(new Date().toLocaleDateString('hu-HU'), {
        x: 0.5,
        y: 2.8,
        w: 9,
        h: 0.5,
        fontSize: 18,
        color: '64748B',
      });

      // Content slides based on type
      switch (parsed.type) {
        case 'table': {
          // Table slides - split into multiple if needed
          const rowsPerSlide = 12;
          for (let i = 0; i < parsed.rows.length; i += rowsPerSlide) {
            const slideRows = parsed.rows.slice(i, i + rowsPerSlide);
            const tableSlide = pptx.addSlide();

            tableSlide.addText(i === 0 ? 'Adatok' : `Adatok (folytatás ${Math.floor(i / rowsPerSlide) + 1})`, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: '1E293B',
            });

            // Format table with header styling
            const tableRows = slideRows.map((row, rowIdx) => {
              return row.map((cell) => ({
                text: cell,
                options: {
                  fill: rowIdx === 0 && i === 0 ? '3B82F6' : rowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                  color: rowIdx === 0 && i === 0 ? 'FFFFFF' : '1E293B',
                  bold: rowIdx === 0 && i === 0,
                },
              }));
            });

            tableSlide.addTable(tableRows, {
              x: 0.5,
              y: 1,
              w: 9,
              colW: Array(Math.max(...slideRows.map((r) => r.length))).fill(9 / Math.max(...slideRows.map((r) => r.length))),
              fontSize: 11,
              border: { pt: 0.5, color: 'E2E8F0' },
            });
          }
          break;
        }

        case 'markdown': {
          // Markdown slides - extract headings as slide titles
          const sections: { title: string; content: string[] }[] = [];
          let currentSection = { title: title || 'Tartalom', content: [] as string[] };

          parsed.text.split('\n').forEach((line) => {
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);

            if (h1Match || h2Match) {
              if (currentSection.content.length > 0) {
                sections.push(currentSection);
              }
              currentSection = { title: h1Match?.[1] || h2Match?.[1] || '', content: [] };
            } else if (line.trim()) {
              // Clean markdown formatting
              let cleanLine = line.replace(/^###?\s+/, ''); // Remove heading markers
              cleanLine = cleanLine.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
              cleanLine = cleanLine.replace(/\*([^*]+)\*/g, '$1'); // Italic
              cleanLine = cleanLine.replace(/^\s*[-*+]\s+/, '• '); // Bullet points
              currentSection.content.push(cleanLine);
            }
          });

          if (currentSection.content.length > 0) {
            sections.push(currentSection);
          }

          // Create slides from sections
          sections.forEach((section) => {
            const contentSlide = pptx.addSlide();
            contentSlide.addText(section.title, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.6,
              fontSize: 28,
              bold: true,
              color: '1E293B',
            });

            // Split content into chunks for readability
            const linesPerSlide = 10;
            const displayContent = section.content.slice(0, linesPerSlide).join('\n');
            contentSlide.addText(displayContent, {
              x: 0.5,
              y: 1.2,
              w: 9,
              h: 4,
              fontSize: 16,
              color: '374151',
              valign: 'top',
              lineSpacingMultiple: 1.3,
            });
          });
          break;
        }

        case 'code': {
          // Code slide with monospace styling
          const codeSlide = pptx.addSlide();
          codeSlide.addText('Kód', {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: '1E293B',
          });

          // Code block background
          codeSlide.addShape('rect', {
            x: 0.3,
            y: 0.9,
            w: 9.4,
            h: 4.2,
            fill: 'F3F4F6',
            line: { color: 'E5E7EB', pt: 1 },
          });

          // Code content (first 25 lines)
          const codeLines = parsed.text.split('\n').slice(0, 25);
          codeSlide.addText(codeLines.join('\n'), {
            x: 0.5,
            y: 1.0,
            w: 9,
            h: 4,
            fontSize: 10,
            fontFace: 'Courier New',
            color: '1F2937',
            valign: 'top',
          });
          break;
        }

        case 'react-dashboard': {
          // Professional dashboard slides with data tables
          const { reactData } = parsed;
          if (!reactData) break;

          // Summary slide with comments/key points
          if (reactData.comments.length > 0 || reactData.metrics.length > 0) {
            const summarySlide = pptx.addSlide();
            summarySlide.addText('Dashboard Összefoglaló', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.6,
              fontSize: 28,
              bold: true,
              color: '1E293B',
            });

            const summaryContent = reactData.comments.slice(0, 8).map((c) => `• ${c}`).join('\n');
            summarySlide.addText(summaryContent || 'Dashboard adatok', {
              x: 0.5,
              y: 1.2,
              w: 9,
              h: 3.5,
              fontSize: 16,
              color: '374151',
              valign: 'top',
              lineSpacingMultiple: 1.4,
            });
          }

          // Data slides - one for each dataset
          reactData.datasets.forEach((dataset) => {
            if (dataset.data.length === 0 || dataset.columns.length === 0) return;

            const datasetTitle = dataset.name.replace(/([A-Z])/g, ' $1').trim();
            const rowsPerSlide = 10;

            // Split data into multiple slides if needed
            for (let i = 0; i < dataset.data.length; i += rowsPerSlide) {
              const slideData = dataset.data.slice(i, i + rowsPerSlide);
              const dataSlide = pptx.addSlide();

              const slideTitle = i === 0
                ? datasetTitle
                : `${datasetTitle} (folytatás ${Math.floor(i / rowsPerSlide) + 1})`;

              dataSlide.addText(slideTitle, {
                x: 0.5,
                y: 0.3,
                w: 9,
                h: 0.5,
                fontSize: 24,
                bold: true,
                color: '1E293B',
              });

              // Build table rows with explicit type
              type PptxTableCell = { text: string; options: Record<string, unknown> };
              const tableRows: PptxTableCell[][] = [];

              // Header row
              const headerRow: PptxTableCell[] = dataset.columns.map((col) => ({
                text: col.replace(/([A-Z])/g, ' $1').trim(),
                options: {
                  fill: '3B82F6',
                  color: 'FFFFFF',
                  bold: true,
                  fontSize: 11,
                },
              }));
              tableRows.push(headerRow);

              // Data rows
              slideData.forEach((row, rowIdx) => {
                const dataRow: PptxTableCell[] = dataset.columns.map((col) => ({
                  text: String(row[col] ?? ''),
                  options: {
                    fill: rowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                    color: '374151',
                    fontSize: 10,
                  },
                }));
                tableRows.push(dataRow);
              });

              // Calculate column widths
              const numCols = dataset.columns.length;
              const colWidth = 9 / numCols;

              dataSlide.addTable(tableRows, {
                x: 0.5,
                y: 1,
                w: 9,
                colW: Array(numCols).fill(colWidth),
                border: { pt: 0.5, color: 'E2E8F0' },
              });

              // Add row count info
              if (i === 0 && dataset.data.length > rowsPerSlide) {
                dataSlide.addText(`Összesen ${dataset.data.length} sor`, {
                  x: 0.5,
                  y: 4.8,
                  w: 9,
                  h: 0.3,
                  fontSize: 10,
                  color: '94A3B8',
                  align: 'right',
                });
              }
            }
          });

          // If no datasets, show a message
          if (reactData.datasets.length === 0) {
            const noDataSlide = pptx.addSlide();
            noDataSlide.addText('Dashboard Adatok', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.6,
              fontSize: 28,
              bold: true,
              color: '1E293B',
            });
            noDataSlide.addText('A dashboardban nem található táblázatos adat.', {
              x: 0.5,
              y: 2,
              w: 9,
              h: 1,
              fontSize: 16,
              color: '64748B',
              align: 'center',
            });
          }
          break;
        }

        case 'presentation': {
          // HTML presentation - extract slides from HTML structure
          const slides = extractSlidesFromHTML(parsed.text);

          if (slides.length === 0) {
            // Fallback: create a single slide with info
            const infoSlide = pptx.addSlide();
            infoSlide.addText('Prezentáció', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.6,
              fontSize: 28,
              bold: true,
              color: '1E293B',
            });
            infoSlide.addText('A prezentáció beépített PDF exporttal rendelkezik.\nHasználd a "PDF Letöltés" gombot az artifact-ban a legjobb minőségért.', {
              x: 0.5,
              y: 2,
              w: 9,
              h: 2,
              fontSize: 16,
              color: '64748B',
              align: 'center',
            });
          } else {
            // Create slides from extracted content
            slides.forEach((slide, index) => {
              const pptxSlide = pptx.addSlide();

              // Slide number
              pptxSlide.addText(`${index + 1} / ${slides.length}`, {
                x: 0.5,
                y: 0.2,
                w: 2,
                h: 0.3,
                fontSize: 10,
                color: '94A3B8',
              });

              // Slide title
              if (slide.title) {
                pptxSlide.addText(slide.title, {
                  x: 0.5,
                  y: 0.5,
                  w: 9,
                  h: 0.7,
                  fontSize: 28,
                  bold: true,
                  color: '1E293B',
                });
              }

              // Content bullets
              if (slide.bullets.length > 0) {
                const bulletText = slide.bullets.map((b) => `• ${b}`).join('\n');
                pptxSlide.addText(bulletText, {
                  x: 0.5,
                  y: slide.title ? 1.4 : 0.5,
                  w: 9,
                  h: 4,
                  fontSize: 16,
                  color: '374151',
                  valign: 'top',
                  lineSpacingMultiple: 1.4,
                });
              }
            });
          }
          break;
        }

        default: {
          // Plain text - split into slides
          const lines = parsed.text.split('\n').filter((l) => l.trim());
          const linesPerSlide = 10;

          for (let i = 0; i < lines.length; i += linesPerSlide) {
            const slideLines = lines.slice(i, i + linesPerSlide);
            const contentSlide = pptx.addSlide();

            contentSlide.addText(slideLines.join('\n\n'), {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 4.5,
              fontSize: 16,
              color: '1E293B',
              valign: 'top',
              lineSpacingMultiple: 1.4,
            });
          }
        }
      }

      // Footer on all slides
      pptx.slides.forEach((slide) => {
        slide.addText('Actionable+ Export', {
          x: 0.5,
          y: 5.2,
          w: 9,
          h: 0.3,
          fontSize: 10,
          color: '94A3B8',
          align: 'center',
        });
      });

      pptx.writeFile({ fileName: generateFilename(title, 'pptx') });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPTX export failed');
      setStatus('error');
    }
  }, []);

  const exportArtifact = useCallback(
    async (content: string, title: string, format: ExportFormat, artifactType?: string) => {
      setError(null);
      switch (format) {
        case 'txt':
          return exportToTxt(content, title);
        case 'csv':
          return exportToCsv(content, title);
        case 'pdf':
          return exportToPdf(content, title, artifactType);
        case 'xlsx':
          return exportToXlsx(content, title, artifactType);
        case 'docx':
          return exportToDocx(content, title, artifactType);
        case 'pptx':
          return exportToPptx(content, title, artifactType);
      }
    },
    [exportToTxt, exportToCsv, exportToPdf, exportToXlsx, exportToDocx, exportToPptx],
  );

  /**
   * Get recommended formats for a given content
   */
  const getRecommendedFormatsForContent = useCallback((content: string, artifactType?: string): ExportFormat[] => {
    const parsed = parseContent(content, artifactType);
    return getRecommendedFormats(parsed.type);
  }, []);

  return { exportArtifact, getRecommendedFormatsForContent, status, setStatus, error };
}
