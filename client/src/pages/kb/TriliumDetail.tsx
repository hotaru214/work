import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useSidebar } from "../../contexts/SidebarContext";

const CREATE_OPTIONS = [
  { type: "text", label: "新建文档", icon: "📄", desc: "创建一篇富文本文档", mime: "text/html" },
  { type: "code", label: "新建代码", icon: "💻", desc: "创建代码片段", mime: "text/plain" },
  { type: "book", label: "新建目录", icon: "📁", desc: "创建文件夹归类笔记" },
  { type: "relation-map", label: "新建关系图", icon: "🔗", desc: "创建可视化关系图" },
  { type: "mermaid", label: "新建图表", icon: "📊", desc: "创建 Mermaid 图表" },
];

interface TreeItem {
  noteId: string;
  title: string;
  type: string;
  isLeaf?: boolean;
  children: TreeItem[];
}

export default function TriliumDetail() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();
  const [note, setNote] = useState<any>(null);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState("text");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const isInDoc = !!noteId && location.pathname.includes("/trilium/doc/");

  function getRootId(): string {
    // If we're in a note, traverse up; otherwise use the noteId param
    return noteId || "";
  }

  async function loadTree() {
    try {
      const rootId = getRootId();
      if (!rootId) return;
      // Try to get the root's parent tree first
      const rootNote = await api.trilium.getNote(rootId);
      // Get tree from root or its parent
      const treeData = await api.trilium.getNoteTree(rootId, 10);
      setTree(Array.isArray(treeData) ? treeData : []);
    } catch (e) {
      console.error("Failed to load tree", e);
      setTree([]);
    }
  }

  async function loadNote() {
    if (!noteId) return;
    setLoading(true);
    try {
      const n = await api.trilium.getNote(noteId);
      setNote(n);
      setTitle(n.title || "");

      if (n.type === "text" || n.type === "code") {
        try {
          const c = await api.trilium.getNoteContent(noteId);
          setContent(c.content || "");
        } catch { setContent(""); }
      } else {
        setContent("");
      }
    } catch (e) {
      console.error("Failed to load note", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (noteId) {
      setSubSidebarOpen(true);
      loadNote();
    }
  }, [noteId]);

  useEffect(() => {
    if (noteId) loadTree();
  }, [noteId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    }
    if (showCreateMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCreateMenu]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const opt = CREATE_OPTIONS.find((o) => o.type === createType)!;
    const parentId = noteId || "root";
    try {
      const result = await api.trilium.createNote(parentId, newTitle.trim(), "", createType);
      setNewTitle("");
      setShowCreateModal(false);
      setShowCreateMenu(false);
      loadTree();
      if (createType === "text" || createType === "code") {
        navigate(`/trilium/${parentId}/doc/${result.note.noteId}`);
      }
    } catch (e) {
      console.error("Failed to create note", e);
    }
  }

  function openCreateModal(type: string) {
    setCreateType(type);
    const label = CREATE_OPTIONS.find((o) => o.type === type)?.label || "新项目";
    setNewTitle(label);
    setShowCreateMenu(false);
    setShowCreateModal(true);
  }

  function renderTree(items: TreeItem[], depth = 0) {
    return items.map((item) => {
      const active = location.pathname.includes(`/doc/${item.noteId}`);
      return (
        <div key={item.noteId}>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded text-sm group transition-colors ${
              active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => navigate(`/trilium/${item.noteId}/doc/${item.noteId}`)}
          >
            <span className="text-xs shrink-0">{getTypeIcon(item.type)}</span>
            <span className="truncate flex-1">{item.title}</span>
            {!item.isLeaf && item.children?.length > 0 && (
              <span className="text-[10px] text-slate-400">{item.children.length}</span>
            )}
          </div>
          {item.children?.length > 0 && renderTree(item.children, depth + 1)}
        </div>
      );
    });
  }

  function getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      text: "📄", code: "💻", book: "📁", image: "🖼️",
      file: "📎", "relation-map": "🔗", mermaid: "📊",
      search: "🔍", "note-map": "🗺️",
    };
    return icons[type] || "📄";
  }

  if (loading && !note) {
    return <div className="flex items-center justify-center h-full text-slate-500">加载中...</div>;
  }

  return (
    <div className="flex h-full">
      {/* ===== Sub-sidebar ===== */}
      <div
        className="bg-white border-r flex flex-col overflow-hidden transition-all duration-200 shrink-0"
        style={{
          width: subSidebarOpen ? "15rem" : "0rem",
          minWidth: subSidebarOpen ? "15rem" : "0rem",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🌲</span>
            <span className="font-semibold text-sm text-slate-700 truncate">
              {note?.title || "Trilium 笔记"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate("/kb")}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"
              title="返回知识库列表"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tree + Create Button */}
        <div className="flex-1 overflow-auto">
          {/* Create button */}
          <div className="px-3 pt-3 pb-1 relative" ref={menuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>新建</span>
            </button>

            {showCreateMenu && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-40 animate-fade-in">
                {CREATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                    onClick={() => openCreateModal(opt.type)}
                  >
                    <span className="text-lg shrink-0">{opt.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700">{opt.label}</div>
                      <div className="text-xs text-slate-400 truncate">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Directory tree */}
          <div className="py-1">
            {tree.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8 px-4">
                暂无内容<br />点击上方 + 创建
              </div>
            ) : renderTree(tree)}
          </div>
        </div>
      </div>

      {/* ===== Content area ===== */}
      <div className="flex-1 overflow-auto bg-slate-50 min-w-0">
        {isInDoc && note ? (
          <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{note.title}</h1>
            <div className="text-xs text-slate-400 mb-6 flex gap-4">
              <span>类型: {note.type}</span>
              {note.dateCreated && <span>创建: {note.dateCreated}</span>}
              {note.dateModified && <span>修改: {note.dateModified}</span>}
            </div>
            <div
              className="bg-white rounded-xl border border-slate-200 p-6 min-h-[300px] prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-5xl mb-4">🌲</div>
              <div className="text-lg">{note?.title || "选择一个笔记开始浏览"}</div>
              <div className="text-sm mt-1">或者点击左侧「新建」创建新内容</div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Floating button when sub-sidebar is hidden ===== */}
      {!subSidebarOpen && (
        <button
          onClick={toggleSubSidebar}
          className="fixed top-16 z-30 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-500"
          style={{ left: "0.75rem" }}
          title="展开目录"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ===== Create Modal ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800">
                {CREATE_OPTIONS.find((o) => o.type === createType)?.icon}{" "}
                {CREATE_OPTIONS.find((o) => o.type === createType)?.label}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  取消
                </button>
                <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}

