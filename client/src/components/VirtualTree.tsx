import { useEffect, useMemo, useRef, useState } from "react";

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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(480);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    setHeight(node.clientHeight || 480);
    const resizeObserver = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height || 480);
    });
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !activeId) return;
    const index = rows.findIndex((item) => item.noteId === activeId);
    if (index < 0) return;

    const rowTop = index * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    const viewTop = node.scrollTop;
    const viewBottom = viewTop + node.clientHeight;

    if (rowTop < viewTop) {
      node.scrollTo({ top: rowTop, behavior: "smooth" });
    } else if (rowBottom > viewBottom) {
      node.scrollTo({ top: rowBottom - node.clientHeight, behavior: "smooth" });
    }
  }, [activeId, rows]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const nextTop = event.currentTarget.scrollTop;
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setScrollTop(nextTop);
      frameRef.current = null;
    });
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(height / ROW_HEIGHT) + OVERSCAN * 2;
  const visibleRows = rows.slice(start, start + visibleCount);
  const icons: Record<string, string> = { text: "TXT", code: "<>", book: "DIR", mermaid: "MM", "relation-map": "MAP" };

  return (
    <div
      ref={scrollerRef}
      className="h-full overflow-auto"
      onScroll={handleScroll}
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
              <span className="w-7 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{icons[item.type] || "DOC"}</span>
              <span className="min-w-0 flex-1 truncate">{item.title || "未命名"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
