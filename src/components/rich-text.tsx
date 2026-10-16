import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/** Convert \( \) and \[ \] LaTeX delimiters to $ / $$ for remark-math, leaving code untouched. */
export function normalizeMath(src: string) {
  return src
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : part
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => `\n$$\n${m.trim()}\n$$\n`)
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => `$${m.trim()}$`)))
    .join('');
}

/** Safe renderer for AI-generated text: Markdown + GFM tables + KaTeX math. Raw HTML is never rendered. */
export function RichText({ text, inline = false, className = '' }: { text: string | null | undefined; inline?: boolean; className?: string }) {
  if (!text) return null;
  const md = <ReactMarkdown
    remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
    rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'ignore' }]]}
    skipHtml
    components={{
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
      table: ({ children }) => <div className="rich-table"><table>{children}</table></div>,
      ...(inline ? { p: ({ children }) => <>{children}</> } : {}),
    }}
  >{normalizeMath(String(text))}</ReactMarkdown>;
  return inline ? <span className={`rich-text inline ${className}`}>{md}</span> : <div className={`rich-text ${className}`}>{md}</div>;
}
