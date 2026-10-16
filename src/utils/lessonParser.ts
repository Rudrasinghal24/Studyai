import { marked } from 'marked';
import katex from 'katex';
import { ParsedLessonSections, SelfTestQuestion } from '../types';

/**
 * Configure marked renderer
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Escapes HTML characters for safe code display
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Checks if a line is part of an ASCII or Unicode box/diagram
 */
function isDiagramLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Plus-minus-dash border e.g. +------------------+ or +======+
  if (/^\+[-=+]+\+?$/.test(trimmed)) return true;

  // Interior line with box walls e.g. |   Hardware   |
  if (/^\|.*\|$/.test(trimmed) && !trimmed.includes('|---|') && !trimmed.includes('|:---|')) {
    return true;
  }

  // Unicode box-drawing characters
  if (/[┌├└╔╠╚]/.test(trimmed) && /[┐┤┘╗╣╝]/.test(trimmed)) return true;
  if (/^[│║─═\s+\-|_/\\<>▲▼►◄^]+$/.test(trimmed) && trimmed.length >= 3) {
    if (
      trimmed.includes('│') ||
      trimmed.includes('║') ||
      trimmed.includes('─') ||
      trimmed.includes('═') ||
      trimmed.includes('┌') ||
      trimmed.includes('└') ||
      trimmed.includes('▲') ||
      trimmed.includes('▼') ||
      trimmed.includes('-->') ||
      trimmed.includes('<--') ||
      trimmed.includes('==>')
    ) {
      return true;
    }
  }

  // Stack arrows e.g. "   |    " or "   v    " or "   │   " or "   ▼   "
  if (/^\s*([|│vV^▲▼]|\-{2,}>|<={2,}|={2,}>)\s*$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Detects contiguous ASCII/Unicode architecture diagrams that were not enclosed in code fences
 * and automatically encloses them in ```diagram ... ```
 */
function wrapUnfencedDiagrams(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let diagramBuffer: string[] = [];

  const flushDiagramBuffer = () => {
    if (diagramBuffer.length === 0) return;
    // Check if the buffer has at least 2 diagram lines and looks like an actual diagram
    const diagramLineCount = diagramBuffer.filter(isDiagramLine).length;
    const isMarkdownTable = diagramBuffer.some((l) => /\|[\s:-]+-\+?\|/.test(l) || /\|[\s:-]+-[\s:-]+\|/.test(l));

    if (diagramLineCount >= 2 && !isMarkdownTable) {
      result.push('```diagram');
      result.push(...diagramBuffer);
      result.push('```');
    } else {
      result.push(...diagramBuffer);
    }
    diagramBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      flushDiagramBuffer();
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    if (isDiagramLine(line)) {
      diagramBuffer.push(line);
    } else {
      // Empty line within a diagram could just be spacing between layers
      if (diagramBuffer.length > 0 && line.trim() === '' && i + 1 < lines.length && isDiagramLine(lines[i + 1])) {
        diagramBuffer.push(line);
      } else {
        flushDiagramBuffer();
        result.push(line);
      }
    }
  }

  flushDiagramBuffer();
  return result.join('\n');
}

/**
 * Safely parse markdown to HTML with full support for:
 * 1. KaTeX Math rendering ($...$ and $$...$$ and \[...\] and \(...\))
 * 2. Unfenced & fenced ASCII/Unicode architecture diagrams
 * 3. Responsive, beautifully styled tables
 * 4. Polished code cards with copy buttons
 */
export function renderMarkdown(markdownText: string): string {
  if (!markdownText) return '';

  try {
    // Step 1: Detect and wrap unfenced ASCII/architecture diagrams
    let text = wrapUnfencedDiagrams(markdownText);

    // Step 2: Protect and extract code blocks before touching math formulas
    const codeBlocks: string[] = [];
    text = text.replace(/```([\s\S]*?)```/g, (match) => {
      const id = `%%CODE_BLOCK_${codeBlocks.length}%%`;
      codeBlocks.push(match);
      return id;
    });

    const inlineCodes: string[] = [];
    text = text.replace(/`([^`\n]+)`/g, (match) => {
      const id = `%%INLINE_CODE_${inlineCodes.length}%%`;
      inlineCodes.push(match);
      return id;
    });

    // Step 3: Extract and render KaTeX math expressions
    const mathMap = new Map<string, string>();
    let mathCounter = 0;

    // Display math: $$ ... $$ or \[ ... \]
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, mathContent) => {
      const id = `%%KATEX_BLOCK_${mathCounter++}%%`;
      try {
        const rendered = katex.renderToString(mathContent.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        mathMap.set(id, `<div class="katex-display-wrapper my-3 overflow-x-auto text-center py-2 px-3 bg-pink-50/40 rounded-xl border border-pink-100">${rendered}</div>`);
      } catch {
        mathMap.set(id, `<pre class="katex-error">${escapeHtml(mathContent)}</pre>`);
      }
      return id;
    });

    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, mathContent) => {
      const id = `%%KATEX_BLOCK_${mathCounter++}%%`;
      try {
        const rendered = katex.renderToString(mathContent.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        mathMap.set(id, `<div class="katex-display-wrapper my-3 overflow-x-auto text-center py-2 px-3 bg-pink-50/40 rounded-xl border border-pink-100">${rendered}</div>`);
      } catch {
        mathMap.set(id, `<pre class="katex-error">${escapeHtml(mathContent)}</pre>`);
      }
      return id;
    });

    // Inline math: $ ... $ or \( ... \)
    // Avoid matching currency like $50 or $1,000 by requiring non-digit or math operators
    text = text.replace(/(?<!\\)\$((?!\s|\d+(?:\.\d+)?(?:\s|$|[,;]))[^$\n\r]+?)(?<!\s)\$/g, (_, mathContent) => {
      const id = `%%KATEX_INLINE_${mathCounter++}%%`;
      try {
        const rendered = katex.renderToString(mathContent.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        mathMap.set(id, `<span class="katex-inline px-1 py-0.5">${rendered}</span>`);
      } catch {
        mathMap.set(id, `<code class="katex-inline-fallback">${escapeHtml(mathContent)}</code>`);
      }
      return id;
    });

    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, mathContent) => {
      const id = `%%KATEX_INLINE_${mathCounter++}%%`;
      try {
        const rendered = katex.renderToString(mathContent.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        mathMap.set(id, `<span class="katex-inline px-1 py-0.5">${rendered}</span>`);
      } catch {
        mathMap.set(id, `<code class="katex-inline-fallback">${escapeHtml(mathContent)}</code>`);
      }
      return id;
    });

    // Step 4: Restore inline codes and code blocks
    text = text.replace(/%%INLINE_CODE_(\d+)%%/g, (_, index) => inlineCodes[Number(index)] || '');
    text = text.replace(/%%CODE_BLOCK_(\d+)%%/g, (_, index) => codeBlocks[Number(index)] || '');

    // Step 5: Parse with Marked
    let html = marked.parse(text) as string;

    // Step 6: Restore KaTeX rendered math tokens
    mathMap.forEach((renderedHtml, token) => {
      html = html.split(token).join(renderedHtml);
    });

    // Step 7: Wrap all <table> elements with responsive .table-wrapper
    html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
    html = html.replace(/<\/table>/g, '</table></div>');

    // Step 8: Upgrade code and diagram blocks with modern headers and copy buttons
    html = html.replace(/<pre><code class="language-([a-zA-Z0-9_\-]+)">([\s\S]*?)<\/code><\/pre>/g, (_, lang, codeContent) => {
      const isDiagram = lang.toLowerCase() === 'diagram' || lang.toLowerCase() === 'ascii';
      const label = isDiagram ? '📐 Architecture Stack / Diagram' : `💻 ${lang.toUpperCase()}`;
      const rawText = codeContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      const base64Code = btoa(encodeURIComponent(rawText));

      return `
<div class="code-container my-4 rounded-2xl border border-pink-200/80 overflow-hidden bg-[#0F172A] shadow-md">
  <div class="code-header flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs">
    <div class="flex items-center gap-2">
      <span class="flex gap-1.5 items-center">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block"></span>
      </span>
      <span class="text-slate-300 font-mono font-bold tracking-wide text-[11px] ml-1">${label}</span>
    </div>
    <button type="button" class="copy-code-btn flex items-center gap-1.5 text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer" data-code="${base64Code}">
      <span>Copy</span>
    </button>
  </div>
  <pre class="p-4 overflow-x-auto font-mono text-xs sm:text-sm text-slate-100 leading-relaxed font-diagram whitespace-pre"><code class="language-${lang}">${codeContent}</code></pre>
</div>`;
    });

    // Also upgrade plain <pre><code> without language class
    html = html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (_, codeContent) => {
      const rawText = codeContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      const base64Code = btoa(encodeURIComponent(rawText));

      return `
<div class="code-container my-4 rounded-2xl border border-pink-200/80 overflow-hidden bg-[#0F172A] shadow-md">
  <div class="code-header flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs">
    <div class="flex items-center gap-2">
      <span class="flex gap-1.5 items-center">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block"></span>
      </span>
      <span class="text-slate-300 font-mono font-bold tracking-wide text-[11px] ml-1">💻 Architecture / Code</span>
    </div>
    <button type="button" class="copy-code-btn flex items-center gap-1.5 text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer" data-code="${base64Code}">
      <span>Copy</span>
    </button>
  </div>
  <pre class="p-4 overflow-x-auto font-mono text-xs sm:text-sm text-slate-100 leading-relaxed font-diagram whitespace-pre"><code>${codeContent}</code></pre>
</div>`;
    });

    return html;
  } catch (err) {
    console.error('Error rendering markdown:', err);
    return `<p class="whitespace-pre-wrap">${escapeHtml(markdownText)}</p>`;
  }
}

/**
 * Splits the lesson into the 5 mandatory sections with flexible, resilient regexes
 * supporting both English and Hinglish fun headers
 */
export function splitLessonSections(fullMarkdown: string): ParsedLessonSections {
  if (!fullMarkdown) return {};

  const cleanText = fullMarkdown.trim();

  // 1. Asli Mudda / The Big Picture
  const p1 = cleanText.search(/#{1,4}\s*(?:1[\.:\)]?\s*)?(?:Asli\s+Mudda|The\s+Big\s+Picture|Big\s+Picture)/i);
  // 2. Dimaag Mein Fit / Key Concepts
  const p2 = cleanText.search(/#{1,4}\s*(?:2[\.:\)]?\s*)?(?:Dimaag\s+Mein|Key\s+Concepts|Concepts\s+Broken)/i);
  // 3. Ek Dum Desi / Real-World Analogy
  const p3 = cleanText.search(/#{1,4}\s*(?:3[\.:\)]?\s*)?(?:Ek\s+Dum\s+Desi|Real[\s-]World\s+Analogy|Analogy)/i);
  // 4. Exam & Real-Life / Practical Application
  const p4 = cleanText.search(/#{1,4}\s*(?:4[\.:\)]?\s*)?(?:Exam\s*[\/\&]?\s*Real[\s-]Life|Kaise\s+Fodna\s+Hai|Practical\s+Application|Assignment)/i);
  // 5. Test Yourself Yaar / Quick Review & Self-Test
  const p5 = cleanText.search(/#{1,4}\s*(?:5[\.:\)]?\s*)?(?:Test\s+Yourself|Quick\s+Review|Self[\s-]Test|Quiz)/i);

  const indices = [
    { key: 'bigPicture', pos: p1 },
    { key: 'keyConcepts', pos: p2 },
    { key: 'analogy', pos: p3 },
    { key: 'practical', pos: p4 },
    { key: 'selfTest', pos: p5 },
  ]
    .filter((item) => item.pos !== -1)
    .sort((a, b) => a.pos - b.pos);

  const sections: ParsedLessonSections = {};

  if (indices.length >= 2) {
    for (let i = 0; i < indices.length; i++) {
      const current = indices[i];
      const next = indices[i + 1];
      const start = current.pos;
      const end = next ? next.pos : cleanText.length;

      const rawChunk = cleanText.slice(start, end).trim();
      const firstNewline = rawChunk.indexOf('\n');
      const body = firstNewline !== -1 ? rawChunk.slice(firstNewline).trim() : rawChunk;

      sections[current.key as keyof ParsedLessonSections] = body;
    }
  } else {
    // Fallback if headers could not be partitioned
    sections.unparsed = cleanText;
  }

  return sections;
}

/**
 * Extracts Q&A items from the Quick Review & Self-Test section
 */
export function parseSelfTestQuestions(selfTestMarkdown?: string): SelfTestQuestion[] {
  if (!selfTestMarkdown) return [];

  const questions: SelfTestQuestion[] = [];
  const text = selfTestMarkdown.trim();

  // Pattern 1: **Q:** / **Question:** followed by **A:** / **Answer:**
  const qaRegex = /(?:\*\*Q(?:\d+)?:\*\*|\*\*Question(?:\s+\d+)?:\*\*|Q(?:\d+)?:\s*)([\s\S]*?)(?=(?:\*\*A(?:\d+)?:\*\*|\*\*Answer(?:\s+\d+)?:\*\*|A(?:\d+)?:\s*))(?:\*\*A(?:\d+)?:\*\*|\*\*Answer(?:\s+\d+)?:\*\*|A(?:\d+)?:\s*)([\s\S]*?)(?=(?:\*\*Q|\*\*Question|Q\d*:|\n{2,}\*\*|$))/gi;

  let match;
  let index = 1;
  while ((match = qaRegex.exec(text)) !== null) {
    const q = match[1]?.trim().replace(/^\d+[\.:\)]\s*/, '');
    const a = match[2]?.trim();
    if (q && a) {
      questions.push({
        id: `q-${index++}`,
        question: q,
        answer: a,
        revealed: false,
      });
    }
  }

  // Pattern 2: Numbered questions with question mark
  if (questions.length === 0) {
    const blocks = text.split(/\n{2,}/);
    let pendingQ = '';

    for (const block of blocks) {
      const line = block.trim();
      if (!line) continue;

      if (
        line.includes('?') &&
        (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.toLowerCase().startsWith('q'))
      ) {
        pendingQ = line;
      } else if (pendingQ) {
        questions.push({
          id: `q-${index++}`,
          question: pendingQ.replace(/^\d+[\.:\)]\s*/, ''),
          answer: line,
          revealed: false,
        });
        pendingQ = '';
      }
    }
  }

  return questions;
}

/**
 * Extracts emphasized technical terms for the Jargon Spotlight
 */
export function extractJargonTerms(keyConceptsMarkdown?: string): { term: string; context: string }[] {
  if (!keyConceptsMarkdown) return [];

  const terms: { term: string; context: string }[] = [];
  const regex = /(?:^|\n)\s*(?:[-*]\s*)?\*\*([^*:\n]{3,40})\*\*(?::|\s*[-–—])?\s*([^\n\r]+)/g;

  let match;
  const seen = new Set<string>();

  while ((match = regex.exec(keyConceptsMarkdown)) !== null) {
    const term = match[1].trim();
    const context = match[2].trim();

    const lower = term.toLowerCase();
    if (
      !term.startsWith('#') &&
      !lower.startsWith('what is') &&
      !lower.startsWith('key concept') &&
      !lower.startsWith('step') &&
      !seen.has(lower)
    ) {
      seen.add(lower);
      terms.push({ term, context });
    }
    if (terms.length >= 8) break;
  }

  return terms;
}
