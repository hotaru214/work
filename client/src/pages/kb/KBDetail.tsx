import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useSidebar } from "../../contexts/SidebarContext";

interface DocTreeItem {
  id: number;
  parent_id: number | null;
  title: string;
  children: DocTreeItem[];
}

const CREATE_OPTIONS = [
  { type: "doc", label: "新建文档", icon: "📄", desc: "创建一篇新的文档" },
  { type: "canvas", label: "新建画板", icon: "🎨", desc: "创建思维导图或白板" },
  { type: "table", label: "新建表格", icon: "📊", desc: "创建数据表格" },
  { type: "mindmap", label: "新建思维导图", icon: "🧠", desc: "创建思维导图" },
  { type: "sheet", label: "新建电子表格", icon: "📋", desc: "创建电子表格" },
];

export default function KBDetail() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();
  const [notebook, setNotebook] = useState<any>(null);
  const [tree, setTree] = useState<DocTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState("doc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const isInDoc = location.pathname.includes("/doc/");

  async function load() {
    setLoading(true);
    try {
      const [nb, docs] = await Promise.all([
        api.getNotebook(Number(notebookId)),
        api.listDocs(Number(notebookId)),
      ]);
      setNotebook(nb);
      setTree(docs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (notebookId) { load(); setSubSidebarOpen(true); }
  }, [notebookId]);

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
    const data: any = { title: newTitle.trim() };
    if (createType !== "doc") {
      data.content = JSON.stringify({ type: createType, title: newTitle.trim(), createdAt: new Date().toISOString() });
    }
    const doc = await api.createDoc(Number(notebookId), data);
    setNewTitle("");
    setShowCreateModal(false);
    setShowCreateMenu(false);
    load();
    if (createType === "doc") {
      navigate(`/kb/${notebookId}/doc/${doc.id}`);
    }
  }

  function openCreateModal(type: string) {
    setCreateType(type);
    const label = CREATE_OPTIONS.find((o) => o.type === type)?.label || "新项目";
    setNewTitle(label);
    setShowCreateMenu(false);
    setShowCreateModal(true);
  }

  function renderTree(items: DocTreeItem[], depth = 0) {
    return items.map((item) => {
      const active = location.pathname.includes(`/doc/${item.id}`);
      return (
        <div key={item.id}>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded text-sm group transition-colors ${
              active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => navigate(`/kb/${notebookId}/doc/${item.id}`)}
          >
            <span className="text-xs shrink-0">📄</span>
            <span className="truncate flex-1">{item.title}</span>
          </div>
          {item.children.length > 0 && renderTree(item.children, depth + 1)}
        </div>
      );
    });
  }

  if (loading || !notebook) return <div className="p-6 text-slate-500">加载中...</div>;

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
            <span className="text-base shrink-0">📚</span>
            <span className="font-semibold text-sm text-slate-700 truncate">{notebook.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { navigate("/kb"); }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"
              title="返回知识库列表"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              onClick={toggleSubSidebar}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"
              title="收起子侧边栏"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* + 新建按钮 */}
        <div className="px-3 py-2 border-b shrink-0" ref={menuRef}>
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm font-medium">新建</span>
            </button>

            {showCreateMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-40 animate-fade-in">
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
        </div>

        {/* 目录树 */}
        <div className="flex-1 overflow-auto py-2">
          {tree.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8 px-4">
              暂无内容<br />点击上方 + 创建
            </div>
          ) : renderTree(tree)}
        </div>
      </div>

      {/* ===== 内容区域 ===== */}
      <div className="flex-1 overflow-auto bg-slate-50 min-w-0">
        {isInDoc ? (
          <Outlet />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-5xl mb-4">📝</div>
              <div className="text-lg">选择一个文档开始编辑</div>
              <div className="text-sm mt-1">或者点击左侧「新建」创建新内容</div>
            </div>
          </div>
        )}
      </div>

      {/* ===== 子侧边栏隐藏时的浮动按钮 ===== */}
      {!subSidebarOpen && (
        <button
          onClick={toggleSubSidebar}
          className="fixed top-16 z-30 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-500"
          style={{ left: "0.75rem" }}
          title="展开目录"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ===== 新建窗口 ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800">
                {CREATE_OPTIONS.find((o) => o.type === createType)?.icon}{" "}
                {CREATE_OPTIONS.find((o) => o.type === createType)?.label}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
