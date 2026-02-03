import dedent from 'dedent';
import { shadcnComponents } from 'librechat-data-provider';
import type {
  SandpackProviderProps,
  SandpackPredefinedTemplate,
} from '@codesandbox/sandpack-react';

const artifactFilename = {
  'application/vnd.react': 'App.tsx',
  'text/html': 'index.html',
  'application/vnd.code-html': 'index.html',
  // mermaid and markdown types are handled separately in useArtifactProps.ts
  default: 'index.html',
  // 'css': 'css',
  // 'javascript': 'js',
  // 'typescript': 'ts',
  // 'jsx': 'jsx',
  // 'tsx': 'tsx',
};

const artifactTemplate: Record<
  | keyof typeof artifactFilename
  | 'application/vnd.mermaid'
  | 'text/markdown'
  | 'text/md'
  | 'text/plain',
  SandpackPredefinedTemplate | undefined
> = {
  'text/html': 'static',
  'application/vnd.react': 'react-ts',
  'application/vnd.mermaid': 'react-ts',
  'application/vnd.code-html': 'static',
  'text/markdown': 'react-ts',
  'text/md': 'react-ts',
  'text/plain': 'react-ts',
  default: 'static',
  // 'css': 'css',
  // 'javascript': 'js',
  // 'typescript': 'ts',
  // 'jsx': 'jsx',
  // 'tsx': 'tsx',
};

export function getKey(type: string, language?: string): string {
  return `${type}${(language?.length ?? 0) > 0 ? `-${language}` : ''}`;
}

export function getArtifactFilename(type: string, language?: string): string {
  const key = getKey(type, language);
  return artifactFilename[key] ?? artifactFilename.default;
}

export function getTemplate(type: string, language?: string): SandpackPredefinedTemplate {
  const key = getKey(type, language);
  return artifactTemplate[key] ?? (artifactTemplate.default as SandpackPredefinedTemplate);
}

const standardDependencies = {
  three: '^0.167.1',
  'lucide-react': '^0.394.0',
  'react-router-dom': '^6.11.2',
  'class-variance-authority': '^0.6.0',
  clsx: '^1.2.1',
  'date-fns': '^3.3.1',
  'tailwind-merge': '^1.9.1',
  'tailwindcss-animate': '^1.0.5',
  recharts: '2.12.7',
  '@radix-ui/react-accordion': '^1.1.2',
  '@radix-ui/react-alert-dialog': '^1.0.2',
  '@radix-ui/react-aspect-ratio': '^1.1.0',
  '@radix-ui/react-avatar': '^1.1.0',
  '@radix-ui/react-checkbox': '^1.0.3',
  '@radix-ui/react-collapsible': '^1.0.3',
  '@radix-ui/react-dialog': '^1.0.2',
  '@radix-ui/react-dropdown-menu': '^2.1.1',
  '@radix-ui/react-hover-card': '^1.0.5',
  '@radix-ui/react-label': '^2.0.0',
  '@radix-ui/react-menubar': '^1.1.1',
  '@radix-ui/react-navigation-menu': '^1.2.0',
  '@radix-ui/react-popover': '^1.0.7',
  '@radix-ui/react-progress': '^1.1.0',
  '@radix-ui/react-radio-group': '^1.1.3',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-separator': '^1.0.3',
  '@radix-ui/react-slider': '^1.1.1',
  '@radix-ui/react-switch': '^1.0.3',
  '@radix-ui/react-tabs': '^1.0.3',
  '@radix-ui/react-toast': '^1.1.5',
  '@radix-ui/react-slot': '^1.1.0',
  '@radix-ui/react-toggle': '^1.1.0',
  '@radix-ui/react-toggle-group': '^1.1.0',
  '@radix-ui/react-tooltip': '^1.2.8',
  'embla-carousel-react': '^8.2.0',
  'react-day-picker': '^9.0.8',
  'dat.gui': '^0.7.9',
  vaul: '^0.9.1',
};

const mermaidDependencies = {
  mermaid: '^11.4.1',
  'react-zoom-pan-pinch': '^3.6.1',
  'class-variance-authority': '^0.6.0',
  clsx: '^1.2.1',
  'tailwind-merge': '^1.9.1',
  '@radix-ui/react-slot': '^1.1.0',
};

const markdownDependencies = {
  'marked-react': '^2.0.0',
};

const dependenciesMap: Record<
  | keyof typeof artifactFilename
  | 'application/vnd.mermaid'
  | 'text/markdown'
  | 'text/md'
  | 'text/plain',
  Record<string, string>
> = {
  'application/vnd.mermaid': mermaidDependencies,
  'application/vnd.react': standardDependencies,
  'text/html': standardDependencies,
  'application/vnd.code-html': standardDependencies,
  'text/markdown': markdownDependencies,
  'text/md': markdownDependencies,
  'text/plain': markdownDependencies,
  default: standardDependencies,
};

export function getDependencies(type: string): Record<string, string> {
  return dependenciesMap[type] ?? standardDependencies;
}

export function getProps(type: string): Partial<SandpackProviderProps> {
  return {
    customSetup: {
      dependencies: getDependencies(type),
    },
  };
}

export const sharedOptions: SandpackProviderProps['options'] = {
  externalResources: ['https://cdn.tailwindcss.com/3.4.17'],
};

export const sharedFiles = {
  '/lib/utils.ts': shadcnComponents.utils,
  '/components/ui/accordion.tsx': shadcnComponents.accordian,
  '/components/ui/alert-dialog.tsx': shadcnComponents.alertDialog,
  '/components/ui/alert.tsx': shadcnComponents.alert,
  '/components/ui/avatar.tsx': shadcnComponents.avatar,
  '/components/ui/badge.tsx': shadcnComponents.badge,
  '/components/ui/breadcrumb.tsx': shadcnComponents.breadcrumb,
  '/components/ui/button.tsx': shadcnComponents.button,
  '/components/ui/calendar.tsx': shadcnComponents.calendar,
  '/components/ui/card.tsx': shadcnComponents.card,
  '/components/ui/carousel.tsx': shadcnComponents.carousel,
  '/components/ui/checkbox.tsx': shadcnComponents.checkbox,
  '/components/ui/collapsible.tsx': shadcnComponents.collapsible,
  '/components/ui/dialog.tsx': shadcnComponents.dialog,
  '/components/ui/drawer.tsx': shadcnComponents.drawer,
  '/components/ui/dropdown-menu.tsx': shadcnComponents.dropdownMenu,
  '/components/ui/input.tsx': shadcnComponents.input,
  '/components/ui/label.tsx': shadcnComponents.label,
  '/components/ui/menubar.tsx': shadcnComponents.menuBar,
  '/components/ui/navigation-menu.tsx': shadcnComponents.navigationMenu,
  '/components/ui/pagination.tsx': shadcnComponents.pagination,
  '/components/ui/popover.tsx': shadcnComponents.popover,
  '/components/ui/progress.tsx': shadcnComponents.progress,
  '/components/ui/radio-group.tsx': shadcnComponents.radioGroup,
  '/components/ui/select.tsx': shadcnComponents.select,
  '/components/ui/separator.tsx': shadcnComponents.separator,
  '/components/ui/skeleton.tsx': shadcnComponents.skeleton,
  '/components/ui/slider.tsx': shadcnComponents.slider,
  '/components/ui/switch.tsx': shadcnComponents.switchComponent,
  '/components/ui/table.tsx': shadcnComponents.table,
  '/components/ui/tabs.tsx': shadcnComponents.tabs,
  '/components/ui/textarea.tsx': shadcnComponents.textarea,
  '/components/ui/toast.tsx': shadcnComponents.toast,
  '/components/ui/toaster.tsx': shadcnComponents.toaster,
  '/components/ui/toggle-group.tsx': shadcnComponents.toggleGroup,
  '/components/ui/toggle.tsx': shadcnComponents.toggle,
  '/components/ui/tooltip.tsx': shadcnComponents.tooltip,
  '/components/ui/use-toast.tsx': shadcnComponents.useToast,
  '/components/ui/chart.tsx': shadcnComponents.chart,
  '/public/index.html': dedent`
    <!DOCTYPE html>
    <html lang="en" class="light">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <script src="https://cdn.tailwindcss.com/3.4.17"></script>
        <script>
          tailwind.config = {
            darkMode: 'class',
          }
        </script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          /* McKinsey-Style Professional Consulting Charts - ActionablePlus */
          /* ALWAYS light background, clean typography, no emojis */
          :root {
            --chart-1: 220 70% 50%;
            --chart-2: 160 60% 45%;
            --chart-3: 30 80% 55%;
            --chart-4: 280 65% 60%;
            --chart-5: 340 75% 55%;
          }

          /* Force light background always */
          html, body, #root {
            min-height: 100%;
            width: 100%;
            background: #FFFFFF !important;
            color: #111827 !important;
          }

          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            background: #FFFFFF !important;
          }

          #root {
            display: flex;
            flex-direction: column;
            padding: 2rem;
            gap: 2rem;
            background: #FFFFFF !important;
          }

          /* Professional typography - McKinsey style */
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            color: #111827 !important;
            letter-spacing: -0.025em;
            margin: 0;
          }

          h1 { font-size: 1.75rem; }
          h2 { font-size: 1.5rem; }
          h3 { font-size: 1.25rem; }

          p, li, td, th, span, div {
            max-width: 100%;
            line-height: 1.6;
            color: #374151;
          }

          /* Text wrapping */
          body, #root, #root * {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          /* Recharts - Professional McKinsey Style */
          .recharts-wrapper {
            max-width: 100% !important;
            overflow: visible;
          }

          .recharts-responsive-container {
            min-height: 320px;
          }

          /* Subtle grid lines */
          .recharts-cartesian-grid line {
            stroke: #E5E7EB !important;
          }

          /* Clean axis text */
          .recharts-text,
          .recharts-cartesian-axis-tick-value,
          .recharts-cartesian-axis-tick text,
          .recharts-layer.recharts-cartesian-axis text,
          .recharts-xAxis text,
          .recharts-yAxis text {
            font-family: 'Inter', system-ui, sans-serif !important;
            font-size: 11px !important;
            fill: #6B7280 !important;
            font-weight: 400 !important;
          }

          .recharts-xAxis .recharts-cartesian-axis-tick-value {
            font-size: 10px !important;
          }

          .recharts-yAxis .recharts-cartesian-axis-tick-value {
            font-size: 11px !important;
          }

          /* Legend - clean and professional */
          .recharts-legend-item-text {
            font-family: 'Inter', system-ui, sans-serif !important;
            font-size: 12px !important;
            color: #4B5563 !important;
            font-weight: 500 !important;
          }

          .recharts-default-legend {
            color: #4B5563 !important;
          }

          /* Tooltip - elegant white background */
          .recharts-tooltip-wrapper {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 12px;
          }

          .recharts-tooltip-wrapper .recharts-default-tooltip {
            background-color: rgba(255, 255, 255, 0.98) !important;
            border: 1px solid #E5E7EB !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
            padding: 12px 16px !important;
          }

          .recharts-tooltip-wrapper .recharts-tooltip-label {
            color: #111827 !important;
            font-weight: 600 !important;
            margin-bottom: 8px !important;
            padding-bottom: 8px !important;
            border-bottom: 1px solid #E5E7EB !important;
          }

          .recharts-tooltip-wrapper .recharts-tooltip-item {
            color: #4B5563 !important;
          }

          /* Labels */
          .recharts-label {
            font-size: 11px !important;
            fill: #6B7280 !important;
          }

          .recharts-pie-label-text {
            font-size: 11px !important;
            fill: #374151 !important;
          }

          /* Axis lines */
          .recharts-cartesian-axis-line {
            stroke: #D1D5DB !important;
          }

          /* Layout */
          #root > div {
            width: 100%;
          }

          svg {
            max-width: 100%;
            height: auto;
          }

          /* Card containers - clean white */
          .chart-container, .card {
            background: #FFFFFF !important;
            border-radius: 8px;
            padding: 1.5rem;
            border: 1px solid #E5E7EB;
          }

          /* Force light theme on all nested elements */
          * {
            color-scheme: light !important;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `,
};
