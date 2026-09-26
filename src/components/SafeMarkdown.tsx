import React from "react";

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g);
  return (
    <>
      {parts.map((part, index) => {
        const strong = part.match(/^\*\*(.+)\*\*$/);
        if (strong) return <strong key={index}>{strong[1]}</strong>;
        const code = part.match(/^`([^`]+)`$/);
        if (code) return <code key={index} className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800">{code[1]}</code>;
        const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
        if (link) {
          const href = safeHref(link[2]);
          if (href) return <a key={index} href={href} target="_blank" rel="noreferrer noopener" className="text-blue-600 underline dark:text-blue-400">{link[1]}</a>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default function SafeMarkdown({ content, className = "" }: { content: string; className?: string }) {
  const normalized = content.replace(/\r\n?/g, "\n");
  const withoutFrontmatter = normalized.startsWith("---\n")
    ? normalized.replace(/^---\n[\s\S]*?\n---\n?/, "")
    : normalized;
  const lines = withoutFrontmatter.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let code: string[] | null = null;

  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`list-${blocks.length}`} className="my-3 list-disc space-y-1 pl-6"><>{list.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</></ul>);
      list = [];
    }
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      flushList();
      if (code) {
        blocks.push(<pre key={`code-${index}`} className="my-3 overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-100"><code>{code.join("\n")}</code></pre>);
        code = null;
      } else code = [];
      return;
    }
    if (code) {
      code.push(line);
      return;
    }
    const item = line.match(/^\s*[-*+]\s+(.+)$/);
    if (item) {
      list.push(item[1]);
      return;
    }
    flushList();
    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      blocks.push(<Tag key={`heading-${index}`} className="my-3 font-semibold"><InlineMarkdown text={heading[2]} /></Tag>);
    } else {
      blocks.push(<p key={`paragraph-${index}`} className="my-2 whitespace-pre-wrap"><InlineMarkdown text={line} /></p>);
    }
  });
  flushList();
  const remainingCode = code as string[] | null;
  if (Array.isArray(remainingCode)) blocks.push(<pre key="unterminated-code" className="my-3 overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-100"><code>{remainingCode.join("\n")}</code></pre>);

  return <div className={`leading-relaxed ${className}`}>{blocks}</div>;
}
