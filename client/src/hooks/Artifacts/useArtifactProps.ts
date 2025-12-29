import { useMemo } from 'react';
import { removeNullishValues } from 'librechat-data-provider';
import type { Artifact } from '~/common';
import { getKey, getProps, getTemplate, getArtifactFilename } from '~/utils/artifacts';
import { getMermaidFiles } from '~/utils/mermaid';
import { getMarkdownFiles } from '~/utils/markdown';

/**
 * Detect if content looks like plain text/markdown rather than code
 * Returns true if content should be rendered as markdown
 */
function shouldRenderAsMarkdown(content: string, type: string): boolean {
  // Already markdown type
  if (type === 'text/markdown' || type === 'text/md' || type === 'text/plain') {
    return true;
  }

  // Skip if explicitly React or HTML
  if (type === 'application/vnd.react' || type === 'text/html' || type === 'application/vnd.code-html') {
    // Check if content actually contains JSX/React syntax
    const hasJsxSyntax = /<[A-Z][a-zA-Z]*|import\s+.*from\s+['"]|export\s+(default\s+)?function|const\s+\w+\s*=\s*\(/.test(content);
    if (hasJsxSyntax) {
      return false;
    }
  }

  // If content looks like plain text (no code patterns), render as markdown
  const codePatterns = [
    /^import\s+/m,                    // ES imports
    /^export\s+(default\s+)?/m,       // ES exports
    /^const\s+\w+\s*=/m,              // const declarations
    /^function\s+\w+/m,               // function declarations
    /^class\s+\w+/m,                  // class declarations
    /<[A-Z][a-zA-Z]*[\s/>]/,          // JSX components
    /useState|useEffect|useRef/,      // React hooks
    /^<!DOCTYPE|^<html/i,             // HTML documents
  ];

  const hasCodePatterns = codePatterns.some(pattern => pattern.test(content));
  return !hasCodePatterns;
}

export default function useArtifactProps({ artifact }: { artifact: Artifact }) {
  const [fileKey, files, effectiveType] = useMemo(() => {
    const key = getKey(artifact.type ?? '', artifact.language);
    const type = artifact.type ?? '';
    const content = artifact.content ?? '';

    if (key.includes('mermaid')) {
      return ['diagram.mmd', getMermaidFiles(content), type];
    }

    // Check if content should be rendered as markdown (content-based detection)
    if (shouldRenderAsMarkdown(content, type)) {
      return ['content.md', getMarkdownFiles(content), 'text/markdown'];
    }

    const fileKey = getArtifactFilename(artifact.type ?? '', artifact.language);
    const files = removeNullishValues({
      [fileKey]: content,
    });
    return [fileKey, files, type];
  }, [artifact.type, artifact.content, artifact.language]);

  const template = useMemo(
    () => getTemplate(effectiveType, artifact.language),
    [effectiveType, artifact.language],
  );

  const sharedProps = useMemo(() => getProps(effectiveType), [effectiveType]);

  return {
    files,
    fileKey,
    template,
    sharedProps,
  };
}
