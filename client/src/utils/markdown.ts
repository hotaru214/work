/**
 * Simple Markdown parser — converts Markdown string to HTML.
 * Supports: headings, bold, italic, strikethrough, code, links, images,
 * lists (ul/ol), blockquotes, hr, tables, fenced code blocks.
 */
export function mdToHtml(md: string): string {
  let html = md;

  // Escape HTML entities first
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks (```lang ... ```) — preserve raw
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${code.trim()}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Headings
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^(\s*)[*-] (.+)$/gm, "$1<li>$2</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    const indent = match.match(/^(\s*)/)?.[1] || "";
    const depth = Math.floor(indent.length / 2);
    const tag = depth === 0 ? "ul" : "ul";
    return `<${tag}>\n${match.replace(/^\s*/gm, "")}</${tag}>\n`;
  });

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter(c => c.trim()).map(c => c.trim());
    return `%%TABLE_ROW_${cells.join("||")}%%`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Line breaks (double newline = paragraph)
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<")) {
    html = "<p>" + html + "</p>";
  }

  // Restore code blocks
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_, idx) => codeBlocks[parseInt(idx)]);

  // Process tables
  const tableRows: string[][] = [];
  html = html.replace(/%%TABLE_ROW_([^%]+)%%/g, (_, cells) => {
    const row = cells.split("||");
    tableRows.push(row);
    return ""; // placeholder removed; we build tables below
  });
  if (tableRows.length > 0) {
    let tableHtml = "<table><thead><tr>";
    if (tableRows[0]) {
      for (const cell of tableRows[0]) {
        tableHtml += `<th>${cell}</th>`;
      }
    }
    tableHtml += "</tr></thead><tbody>";
    for (let i = 1; i < tableRows.length; i++) {
      tableHtml += "<tr>";
      for (const cell of tableRows[i]) {
        tableHtml += `<td>${cell}</td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table>";
    html += tableHtml;
  }

  return html;
}

/**
 * Simple HTML to Markdown converter — basic but functional.
 * Strips HTML tags and converts common elements back to Markdown syntax.
 */
export function htmlToMd(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");

  // Bold + italic
  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, "***$1***");
  md = md.replace(/<em><strong>(.*?)<\/strong><\/em>/gi, "***$1***");

  // Bold
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");

  // Italic
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");

  // Strikethrough
  md = md.replace(/<del>(.*?)<\/del>/gi, "~~$1~~");

  // Code blocks
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n\n");

  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (_, content) => {
    return "> " + content.replace(/<br\s*\/?>/gi, "\n> ") + "\n\n";
  });

  // Horizontal rules
  md = md.replace(/<hr[^>]*>/gi, "---\n\n");

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
    return items.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n";
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
    let i = 1;
    return items.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + "\n";
  });

  // Table cells
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_: string, table: string) => {
    const rows: string[] = [];
    let inHeader = false;
    table.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_: string, row: string) => {
      const cells: string[] = [];
      row.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, (_: string, cell: string) => {
        cells.push(cell.trim());
        return "";
      });
      rows.push("| " + cells.join(" | ") + " |");
      if (!inHeader) {
        inHeader = true;
        rows.push("| " + cells.map(() => "---").join(" | ") + " |");
      }
      return "";
    });
    return rows.join("\n") + "\n\n";
  });

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Remove remaining HTML tags
  md = md.replace(/<[^>]*>/g, "");

  // Collapse multiple blank lines
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}