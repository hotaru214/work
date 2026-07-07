import { useMemo, useState } from "react";

type TreeNode = {
  noteId: string;
  title: string;
  type: string;
  children?: TreeNode[];
};

type FlatNode = TreeNode & { depth: number };

const ROW_HEIGHT = 32;
const OVERSCAN = 8;

function flattenTree(items: TreeNode[], depth = 0): FlatNode[] {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenTree(item.children ?? [], depth + 1),
  ]);
}

export default function VirtualTree({
  items,
  activeId,
  onSelect,
  onPrefetch,
}: {
  items: TreeNode[];
  activeId?: string;
  onSelect: (item: TreeNode) => void;
  onPrefetch?: (item: TreeNode) => void;
}) {
  const rows = useMemo(() => flattenTree(items), [items]);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(480);

  function updateViewport(node: HTMLDivElement | null) {
    if (node) setHeight(node.clientHeight);
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(height / ROW_HEIGHT) + OVERSCAN * 2;
  const visibleRows = rows.slice(start, start + visibleCount);
  const icons: Record<string, string> = { text: "□", code: "<>", book: "▣", mermaid: "◇", "relation-map": "◎" };

  return (
    <div
      ref={updateViewport}
      className="h-full overflow-auto"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
        {visibleRows.map((item, index) => {
          const top = (start + index) * ROW_HEIGHT;
          const active = item.noteId === activeId;
          return (
            <button
              key={item.noteId}
              type="button"
              className={[
                "absolute left-0 right-0 flex h-8 items-center gap-1.5 rounded px-3 text-left text-sm transition-colors",
                active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100",
              ].join(" ")}
              style={{ top, paddingLeft: 12 + item.depth * 16 }}
              onMouseEnter={() => onPrefetch?.(item)}
              onFocus={() => onPrefetch?.(item)}
              onClick={() => onSelect(item)}
            >
              <span className="w-5 shrink-0 text-xs text-slate-400">{icons[item.type] || "□"}</span>
              <span className="min-w-0 flex-1 truncate">{item.title || "未命名"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
