import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSidebar } from "../../contexts/SidebarContext";

const CREATE_OPTIONS = [
  { type: "text", label: "新建文档", icon: "📄", desc: "创建富文本文档", mime: "text/html" },
  { type: "code", label: "新建代码", icon: "💻", desc: "创建代码片段", mime: "text/plain" },
  { type: "book", label: "新建文件夹", icon: "📁", desc: "创建子文件夹分类" },
  { type: "mermaid", label: "新建图表", icon: "📊", desc: "创建 Mermaid 图表", mime: "text/mermaid" },
  { type: "relation-map", label: "新建关系图", icon: "🔗", desc: "创建可视化关系图" },
];

const SAVE_DELAY = 2000;

export default function KBDetail() {
  // noteId = current book/container, docId = document being edited (optional)
  const { noteId: notebookId, docId } = useParams();
  const currentDocId = docId || null;
  const activeNoteId = currentDocId || notebookId || "";

  const navigate = useNavigate();
  const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const [note, setNote] = useState<any>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"" | "保存中..." | "已保存">("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState("text");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Refs to avoid stale closures in save timer
  const titleRef = useRef(title);
  titleRef.current = title;
  const contentRef = useRef(content);
  contentRef.current = content;
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const isBook = note?.type === "book" && !currentDocId;

  async function loadNote() {
    if (!activeNoteId) return;
    setLoading(true);
    try {
      const n = await api.kb.getNote(activeNoteId);
      setNote(n);
      setTitle(n.title || "");
      setContent(n.content || "");
    } catch { setNote(null); }
    finally { setLoading(false); }
  }

  async function loadTree() {
    if (!notebookId) return;
    try {
      const t = await api.kb.getNoteTree(notebookId);
      setTree(Array.isArray(t) ? t : []);
    } catch { setTree([]); }
  }

  useEffect(() => {
    // Clear any pending save when navigating to a different note
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = 0;
    }
    setSaveStatus("");
    if (activeNoteId) {
      setSubSidebarOpen(true);
      loadNote();
      if (notebookId) loadTree();
    }
  }, [activeNoteId, notebookId]);

  useEffect(() => {
    // Set content only when not a book
    if (editorRef.current && content && !isBook) {
      editorRef.current.innerHTML = content;
    }
  }, [activeNoteId, isBook, content]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowCreateMenu(false);
    }
    if (showCreateMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCreateMenu]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const htmlContent = editorRef.current?.innerHTML || "";
      setSaveStatus("保存中...");
      try {
        await api.kb.updateContent(activeNoteId, { title, content: htmlContent });
        setContent(htmlContent);
        setSaveStatus("已保存");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch { setSaveStatus(""); }
    }, SAVE_DELAY);
  }, [title, activeNoteId]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave();
  }, [scheduleSave]);

  const handleEditorInput = useCallback(() => { scheduleSave(); }, [scheduleSave]);

  function execCommand(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  }

  async function handleCreate() {
    if (!newTitle.trim() || !notebookId) return;
    const opt = CREATE_OPTIONS.find((o) => o.type === createType)!;
    try {
      const result = await api.kb.createNote(notebookId, newTitle.trim(), "", createType, opt.mime);
      setNewTitle(""); setShowCreateModal(false); setShowCreateMenu(false);
      loadTree();
      if (createType === "text" || createType === "code" || createType === "mermaid") {
        navigate(`/kb/${notebookId}/doc/${result.note.noteId}`);
      }
    } catch { console.error("create failed"); }
  }

  function openCreateModal(type: string) {
    setCreateType(type);
    setNewTitle(CREATE_OPTIONS.find((o) => o.type === type)?.label || "新项目");
    setShowCreateMenu(false);
    setShowCreateModal(true);
  }

  function renderTree(items: any[], depth = 0) {
    return items.map((item: any) => {
      const isActive = item.noteId === activeNoteId;
      const icons: Record<string, string> = { text: "📄", code: "💻", book: "📁", mermaid: "📊", "relation-map": "🔗" };
      return (
        <div key={item.noteId}>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded text-sm group transition-colors ${isActive ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-100 text-slate-700"}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => {
              if (item.type === "book") navigate(`/kb/${item.noteId}`);
              else navigate(`/kb/${notebookId}/doc/${item.noteId}`);
            }}>
            <span className="text-xs shrink-0">{icons[item.type] || "📄"}</span>
            <span className="truncate flex-1">{item.title}</span>
          </div>
          {item.children?.length > 0 && renderTree(item.children, depth + 1)}
        </div>
      );
    });
  }

  function handleLink() { const url = prompt("输入链接地址：", "https://"); if (url) execCommand("createLink", url); }
  function handleImage() { const url = prompt("输入图片地址：", "https://"); if (url) execCommand("insertImage", url); }
  function getWordCount() { return (editorRef.current?.innerText || "").replace(/\s/g, "").length; }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500">加载中...</div>;
  if (!note) return <div className="flex items-center justify-center h-full text-slate-400">笔记不存在</div>;

  return (
    <div className="flex h-full">
      {/* Sub-sidebar: Note Tree */}
      <div className="bg-white border-r flex flex-col overflow-hidden transition-all duration-200 shrink-0"
        style={{ width: subSidebarOpen ? "16rem" : "0rem", minWidth: subSidebarOpen ? "16rem" : "0rem" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📚</span>
            <span className="font-semibold text-sm text-slate-700 truncate">{note.title}</span>
          </div>
          <button onClick={() => navigate("/kb")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400" title="返回">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-3 pt-3 pb-1 relative" ref={menuRef}>
            <button onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span>新建</span>
            </button>
            {showCreateMenu && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-40 animate-fade-in">
                {CREATE_OPTIONS.map((opt) => (
                  <button key={opt.type} onClick={() => openCreateModal(opt.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 transition-colors">
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
          <div className="py-1">
            {tree.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8 px-4">暂无内容<br />点击上方 + 创建</div>
            ) : renderTree(tree)}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-auto bg-white min-w-0">
        {isBook ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-5xl mb-4">📚</div>
              <div className="text-lg font-medium text-slate-600 mb-2">{note.title}</div>
              <div className="text-sm">选择一个笔记开始编辑，或点击左侧「新建」创建新内容</div>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-3 py-2 border-b bg-white flex items-center gap-1 shrink-0 overflow-x-auto">
              <button onClick={() => execCommand("bold")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-sm font-bold" title="粗体">B</button>
              <button onClick={() => execCommand("italic")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-sm italic" title="斜体">I</button>
              <button onClick={() => execCommand("underline")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-sm underline" title="下划线">U</button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={handleLink} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="链接">🔗</button>
              <button onClick={handleImage} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="图片">🖼️</button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={() => execCommand("formatBlock", "<h1>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="标题1">H1</button>
              <button onClick={() => execCommand("formatBlock", "<h2>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="标题2">H2</button>
              <button onClick={() => execCommand("formatBlock", "<h3>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="标题3">H3</button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={() => execCommand("insertUnorderedList")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="列表">•</button>
              <button onClick={() => execCommand("insertOrderedList")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="有序列表">1.</button>
              <button onClick={() => execCommand("formatBlock", "<blockquote>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="引用">❝</button>
            </div>

            {/* Title bar */}
            <div className="px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0">
              <input className="flex-1 text-lg font-semibold border-none outline-none bg-transparent min-w-0"
                value={title} onChange={handleTitleChange} placeholder="标题" />
              {saveStatus && (
                <span className={`text-xs shrink-0 ${saveStatus === "已保存" ? "text-green-600" : "text-slate-400"}`}>
                  {saveStatus}
                </span>
              )}
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-auto bg-white relative">
              <div ref={editorRef} className="w-full h-full p-6 pb-10 max-w-3xl mx-auto outline-none text-base leading-relaxed"
                contentEditable suppressContentEditableWarning onInput={handleEditorInput}
                style={{ minHeight: "100%" }} data-placeholder="开始写笔记..." />
              <div className="absolute bottom-2 left-4 text-[11px] text-slate-400 select-none pointer-events-none">
                字数：{getWordCount()}
              </div>
            </div>
          </>
        )}
      </div>

      {!subSidebarOpen && (
        <button onClick={toggleSubSidebar} className="fixed top-16 z-30 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-500" style={{ left: "0.75rem" }} title="展开目录">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-5">
              {CREATE_OPTIONS.find((o) => o.type === createType)?.icon} {CREATE_OPTIONS.find((o) => o.type === createType)?.label}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">取消</button>
                <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
      `}</style>
    </div>
  );
}