"use client";

import React from "react";

interface Props {
  content: string;
}

/**
 * 简易 Markdown 渲染组件
 * 将 markdown 文本转为带样式的 HTML
 */
/**
 * 处理文本中的 <br> 标签：按 <br> 拆分为多行，行间插入 <br/> 元素
 */
function renderWithLineBreaks(text: string): React.ReactNode {
  if (!text.includes("<br>")) {
    return renderInlineMarkdown(text);
  }
  const segments = text.split("<br>");
  return (
    <>
      {segments.map((seg, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <br />}
          {renderInlineMarkdown(seg.trim())}
        </React.Fragment>
      ))}
    </>
  );
}

export function MarkdownContent({ content }: Props) {
  if (!content) {
    return (
      <p className="text-sm text-[var(--text-secondary)]/60 italic">
        暂无内容
      </p>
    );
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  let tableRows: string[][] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let hasHeader = false;
  let codeBlockLines: string[] = [];
  let inCodeBlock = false;

  const flushTable = () => {
    if (tableRows.length === 0) return;

    elements.push(
      <div key={`table-${elements.length}`} className="card-terminal p-3 my-4 overflow-x-auto">
        <table className="w-full text-[13px]">
          {hasHeader && tableHeader.length > 0 && (
            <thead>
              <tr className="border-b border-[var(--border-custom)]">
                {tableHeader.map((cell, ci) => (
                  <th
                    key={ci}
                    className="text-left py-2 px-2 text-[var(--text-secondary)]/60 font-medium whitespace-normal"
                  >
                    {stripMarkdownInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-[var(--border-custom)]/50 last:border-0"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="py-2 px-2 text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-normal break-words"
                  >
                    {renderWithLineBreaks(stripMarkdownInline(cell))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    tableRows = [];
    tableHeader = [];
    hasHeader = false;
    inTable = false;
  };

  const flushCodeBlock = () => {
    if (codeBlockLines.length === 0) return;

    elements.push(
      <pre
        key={`code-${elements.length}`}
        className="my-3 p-4 rounded-lg bg-[var(--panel2)] border border-[var(--border-custom)] overflow-x-auto"
      >
        <code className="text-[13px] font-mono text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
          {codeBlockLines.join("\n")}
        </code>
      </pre>
    );

    codeBlockLines = [];
    inCodeBlock = false;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // 代码块
    if (line.trim().startsWith("```")) {
      flushTable();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      i++;
      continue;
    }

    // 表格
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .split("|")
        .filter((c) => c.length > 0)
        .map((c) => c.trim());

      // 检查是否为分隔行
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) {
        if (tableRows.length > 0 && !hasHeader) {
          // 上一行是表头
          tableHeader = tableRows.pop()!;
          hasHeader = true;
        }
        i++;
        continue;
      }

      if (!inTable) {
        flushTable();
        inTable = true;
        tableRows = [];
        tableHeader = [];
        hasHeader = false;
      }

      tableRows.push(cells);
      i++;
      continue;
    } else {
      flushTable();
    }

    const trimmed = line.trim();

    // 空行
    if (trimmed === "") {
      i++;
      continue;
    }

    // 水平线
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(
        <hr
          key={`hr-${elements.length}`}
          className="my-4 border-[var(--border-custom)]"
        />
      );
      i++;
      continue;
    }

    // 标题 #
    if (trimmed.startsWith("# ") || trimmed.startsWith("#\t")) {
      const text = trimmed.replace(/^#\s*/, "");
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          className="text-2xl font-bold text-[var(--text-primary)] pb-3 mb-4 border-b border-[var(--border-custom)]"
        >
          {renderInlineMarkdown(text)}
        </h1>
      );
      i++;
      continue;
    }

    // ##
    if (trimmed.startsWith("## ") || trimmed.startsWith("##\t")) {
      const text = trimmed.replace(/^##\s*/, "");
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3"
        >
          {renderInlineMarkdown(text)}
        </h2>
      );
      i++;
      continue;
    }

    // ###
    if (trimmed.startsWith("### ") || trimmed.startsWith("###\t")) {
      const text = trimmed.replace(/^###\s*/, "");
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-base font-semibold text-[var(--text-primary)] mt-4 mb-2"
        >
          {renderInlineMarkdown(text)}
        </h3>
      );
      i++;
      continue;
    }

    // 引用 >
    if (trimmed.startsWith(">")) {
      const text = trimmed.replace(/^>\s*/, "");
      elements.push(
        <blockquote
          key={`bq-${elements.length}`}
          className="border-l-2 border-[var(--blue)] pl-4 py-2 my-3 text-[13px] text-[var(--text-secondary)]/90 leading-relaxed italic"
        >
          {renderWithLineBreaks(text) || " "}
        </blockquote>
      );
      i++;
      continue;
    }

    // 无序列表
    if (/^[\-\*\+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*\+]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\-\*\+]\s*/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1.5 my-2 pl-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-[13px] text-[var(--text-secondary)] leading-relaxed"
            >
              {renderWithLineBreaks(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 有序列表
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-2 pl-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-[13px] text-[var(--text-secondary)] leading-relaxed"
            >
              {renderWithLineBreaks(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 普通段落
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="text-[14px] text-[var(--text-secondary)] leading-relaxed my-2 break-words"
      >
        {renderWithLineBreaks(trimmed)}
      </p>
    );

    i++;
  }

  // 清理剩余
  flushTable();
  flushCodeBlock();

  return <div className="markdown-content">{elements}</div>;
}

/**
 * 去除行内的 markdown 标记，返回纯文本
 */
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
}

/**
 * 全面剥离所有 Markdown 标记，返回纯文本
 * 处理：标题#、加粗**、斜体*、代码`、链接[]()、引用>、分隔线---、表格|
 */
export function stripAllMarkdown(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      let l = line.trim();
      if (!l || /^-{3,}$/.test(l) || /^\|.+\|$/.test(l)) return "";
      l = l.replace(/^#{1,6}\s*/, "");
      l = l.replace(/^>\s*/, "");
      l = stripMarkdownInline(l);
      return l;
    })
    .filter((l) => l.length > 0)
    .join("\n");
}

/**
 * 渲染行内 markdown：加粗、斜体、代码、链接
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>
          {renderInlineItalic(text.slice(lastIndex, match.index))}
        </span>
      );
    }
    parts.push(
      <strong key={key++} className="font-bold text-[var(--text-primary)]">
        {renderInlineItalic(match[1])}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={key++}>{renderInlineItalic(text.slice(lastIndex))}</span>
    );
  }

  if (parts.length === 0) {
    parts.push(<span key={key++}>{renderInlineItalic(text)}</span>);
  }

  return <>{parts}</>;
}

/**
 * 渲染行内斜体 *text*
 */
function renderInlineItalic(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const italicRegex = /\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{renderInlineCode(text.slice(lastIndex, match.index))}</span>
      );
    }
    parts.push(
      <em key={key++} className="italic">
        {renderInlineCode(match[1])}
      </em>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={key++}>{renderInlineCode(text.slice(lastIndex))}</span>
    );
  }

  if (parts.length === 0) {
    parts.push(<span key={key++}>{renderInlineCode(text)}</span>);
  }

  return <>{parts}</>;
}

/**
 * 渲染行内代码 `code`
 */
function renderInlineCode(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <code
        key={key++}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--panel2)] text-[var(--blue)]"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  if (parts.length === 0) {
    parts.push(<span key={key++}>{text}</span>);
  }

  return <>{parts}</>;
}
