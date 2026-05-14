export function extractTitleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));
  return (heading ? heading.replace(/^#\s+/, "") : fallback).trim().slice(0, 64);
}

export function summarizeMarkdown(markdown: string) {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function stripUnicodeReplacementChars(text: string) {
  return String(text || "")
    .replace(/\uFFFD+/g, "")
    .replace(/\s+([，。！？；：])/g, "$1");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    const cleanAlt = escapeHtml(String(alt || "").trim());
    const cleanSrc = String(src || "").trim();
    return `<img src="${cleanSrc}" alt="${cleanAlt}" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const cleanHref = String(href || "").trim();
    return `<a href="${cleanHref}">${escapeHtml(String(label || "").trim())}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

export function markdownToWechatHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").trim().split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listTag: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join("<br />"))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listTag || !listItems.length) return;
    html.push(`<${listTag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      html.push("<p><br /></p>");
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      listTag = "ul";
      listItems.push(ulMatch[1].trim());
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      listTag = "ol";
      listItems.push(olMatch[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return html.join("\n");
}

export function mergeArticleWithImages(markdown: string, imageUrls: string[]) {
  if (!imageUrls.length) return markdown;
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inserted = 0;
  const paragraphIndexes = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((item) => item.line && !item.line.startsWith("#"))
    .map((item) => item.index);

  const interval = Math.max(2, Math.floor(paragraphIndexes.length / (imageUrls.length + 1)));
  const targets = new Set(paragraphIndexes.filter((_, index) => index > 0 && index % interval === 0).slice(0, imageUrls.length));

  lines.forEach((line, index) => {
    result.push(line);
    if (targets.has(index) && inserted < imageUrls.length) {
      result.push("");
      result.push(`![配图 ${inserted + 1}](${imageUrls[inserted]})`);
      inserted += 1;
    }
  });

  while (inserted < imageUrls.length) {
    result.push("");
    result.push(`![配图 ${inserted + 1}](${imageUrls[inserted]})`);
    inserted += 1;
  }

  return result.join("\n");
}
