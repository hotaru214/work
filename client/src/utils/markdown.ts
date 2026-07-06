/**
 * Markdown to HTML converter.
 */
export function mdToHtml(md: string): string {
  const codeBlocks: string[] = [];
  let text = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push("<pre><code" + (lang ? ' class="language-' + lang + '"' : "") + ">" + _escapeHtml(code.trim()) + "</code></pre>");
    return "%%CB" + (codeBlocks.length - 1) + "%%";
  });

  text = _escapeHtml(text);
  text = text.replace(/%%CB(\d+)%%/g, (_, i) => "%%CB" + i + "%%");

  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") { i++; continue; }

    if (/^%%CB\d+%%$/.test(trimmed)) {
      result.push(codeBlocks[+trimmed.replace(/%%CB(\d+)%%/, "$1")]);
      i++; continue;
    }

    if (/^---+\s*$/.test(trimmed)) { result.push("<hr />"); i++; continue; }

    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      result.push("<h" + hMatch[1].length + ">" + _inline(hMatch[2]) + "</h" + hMatch[1].length + ">");
      i++; continue;
    }

    if (trimmed.startsWith("> ")) {
      const quotes: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quotes.push(lines[i].trim().slice(2));
        i++;
      }
      result.push("<blockquote><p>" + quotes.map(q => _inline(q)).join("</p><p>") + "</p></blockquote>");
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      result.push("<ul>" + items.map(item => "<li>" + _inline(item) + "</li>").join("") + "</ul>");
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      result.push("<ol>" + items.map(item => "<li>" + _inline(item) + "</li>").join("") + "</ol>");
      continue;
    }

    if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().split("|").filter(c => c.trim()).map(c => c.trim());
        rows.push(cells);
        i++;
      }
      let tbl = "<table>";
      if (rows.length > 0) {
        tbl += "<thead><tr>";
        for (const cell of rows[0]) tbl += "<th>" + _inline(cell) + "</th>";
        tbl += "</tr></thead>";
      }
      let bodyStart = 1;
      if (rows.length >= 2 && rows[1].every(c => /^-+$/.test(c))) bodyStart = 2;
      if (bodyStart < rows.length) {
        tbl += "<tbody>";
        for (let r = bodyStart; r < rows.length; r++) {
          tbl += "<tr>";
          for (const cell of rows[r]) tbl += "<td>" + _inline(cell) + "</td>";
          tbl += "</tr>";
        }
        tbl += "</tbody>";
      }
      tbl += "</table>";
      result.push(tbl);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      para.push(lines[i].trim());
      i++;
    }
    result.push("<p>" + para.map(p => _inline(p)).join("<br />") + "</p>");
  }

  return result.join("\n");
}

function _inline(s: string): string {
  let t = s;
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/~~(.+?)~~/g, "<del>$1</del>");
  return t;
}

function _escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * HTML to Markdown converter.
 */
export function htmlToMd(html: string): string {
  let md = html;

  const saved: string[] = [];
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, function(_, code) {
    saved.push(code.trim());
    return "%%SAVED" + (saved.length - 1) + "%%";
  });

  md = md.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, function(_, level, content) {
    return "#".repeat(+level) + " " + _stripTags(content) + "\n\n";
  });

  md = md.replace(/<(strong|b)><(em|i)>(.*?)<\/(em|i)><\/(strong|b)>/gi, "***$3***");
  md = md.replace(/<(em|i)><(strong|b)>(.*?)<\/(strong|b)><\/(em|i)>/gi, "***$3***");
  md = md.replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, "**$2**");
  md = md.replace(/<(em|i)>(.*?)<\/(em|i)>/gi, "*$2*");
  md = md.replace(/<del>(.*?)<\/del>/gi, "~~$1~~");
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)");

  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function(_, content) {
    return "> " + _stripTags(content).replace(/\n\s*/g, "\n> ").trim() + "\n\n";
  });

  md = md.replace(/<hr[^>]*>/gi, "---\n\n");

  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(_: string, items: string) {
    return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function(_2: string, li: string) {
      return "- " + _stripTags(li).trim() + "\n";
    }) + "\n";
  });

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(_: string, items: string) {
    let n = 1;
    return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function(_2: string, li: string) {
      return n++ + ". " + _stripTags(li).trim() + "\n";
    }) + "\n";
  });

  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, function(_: string, table: string) {
    const rows: string[] = [];
    let headerDone = false;
    table.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, function(_2: string, row: string) {
      const cells: string[] = [];
      row.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, function(_3: string, cell: string) {
        cells.push(_stripTags(cell).trim());
        return "";
      });
      rows.push("| " + cells.join(" | ") + " |");
      if (!headerDone) {
        headerDone = true;
        rows.push("| " + cells.map(function() { return "---"; }).join(" | ") + " |");
      }
      return "";
    });
    return rows.join("\n") + "\n\n";
  });

  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n");

  md = md.replace(/%%SAVED(\d+)%%/g, function(_, i) {
    return "```\n" + saved[+i] + "\n```\n\n";
  });

  md = md.replace(/<[^>]*>/g, "");
  md = md.replace(/\n{4,}/g, "\n\n\n");

  return md.trim();
}

function _stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}