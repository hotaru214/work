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

const FONT_SIZES = ["12","14","16","18","20","24","28","32","36","48","64"];
const SAVE_DELAY = 2000;

export default function KBDetail() {
  // noteId = current book/container, docId = document being edited (optional)
  const { noteId: notebookId, docId } = useParams();
  const currentDocId = docId || null;
  const activeNoteId = currentDocId || notebookId || "";

  const navigate = useNavigate();
  const { mainSidebarOpen, subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showHeading, setShowHeading] = useState(false);
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
      const currentId = activeNoteIdRef.current;
      const currentTitle = titleRef.current;
      const htmlContent = isBook ? undefined : (editorRef.current?.innerHTML || "");
      setSaveStatus("保存中...");
      try {
        const data: any = { title: currentTitle };
        if (htmlContent !== undefined) data.content = htmlContent;
        await api.kb.updateContent(currentId, data);
        if (htmlContent !== undefined) setContent(htmlContent);
        setSaveStatus("已保存");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch { setSaveStatus(""); }
    }, SAVE_DELAY);
  }, [isBook]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave();
  }, [scheduleSave]);

  const handleEditorInput = useCallback(() => { scheduleSave(); }, [scheduleSave]);

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }

  function handleHeading(tag: string) {
    document.execCommand("formatBlock", false, "<" + tag + ">");
    setShowHeading(false);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleFontSize(size: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const span = document.createElement("span");
      span.style.fontSize = size + "px";
      try { sel.getRangeAt(0).surroundContents(span); } catch {}
    }
    setShowFontSize(false);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleColor(color: string) {
    document.execCommand("styleWithCSS", false, "true");
    execCmd("foreColor", color);
    setShowColor(false);
  }

  function handleBgColor(color: string) {
    document.execCommand("styleWithCSS", false, "true");
    execCmd("hiliteColor", color);
    setShowBgColor(false);
  }

  function handleImage() {
    const url = prompt("请输入图片地址");
    if (url) execCmd("insertImage", url);
  }

  function createTable() {
    const rows = prompt("行数", "3");
    const cols = prompt("列数", "3");
    if (rows && cols) {
      let html = "<table border='1' style='border-collapse:collapse;width:100%;margin:0.5em 0'>";
      for (let r = 0; r < parseInt(rows); r++) {
        html += "<tr>";
        for (let c = 0; c < parseInt(cols); c++) {
          html += "<td style='padding:6px;border:1px solid #ccc'>&nbsp;</td>";
        }
        html += "</tr>";
      }
      html += "</table>";
      document.execCommand("insertHTML", false, html);
      if (editorRef.current) editorRef.current.focus();
    }
  }

  function getWordCount() {
    return (editorRef.current?.innerText || "").replace(/\s/g, "").length;
  }

    function handleTreeSelect(noteId: string) {
    const isFolder = note?.type === "book" && note?.noteId === noteId;
    if (isFolder) {
      navigate("/kb/" + noteId);
    } else {
      navigate("/kb/" + notebookId + "/doc/" + noteId);
    }
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

  function handleLink() { const url = prompt("输入链接地址：", "https://"); if (url) execCmd("createLink", url); }
  

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500">加载中...</div>;
  if (!note) return <div className="flex items-center justify-center h-full text-slate-400">笔记不存在</div>;

  function SubToggle() {
    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";
    return (
      <button onClick={toggleSubSidebar}
        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"
        style={{ left: leftPos, transition: "left 0.2s" }}
        title={subSidebarOpen ? "收起目录" : "展开目录"}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={subSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
        </svg>
      </button>
    );
  }

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
                        <div ref={dropdownRef} className="px-2 py-1.5 border-b bg-white flex items-center gap-0.5 flex-wrap shrink-0 select-none overflow-x-auto">
              <button onClick={() => execCmd("undo")} className="tb-btn" title="撤销">↩</button>
              <button onClick={() => execCmd("redo")} className="tb-btn" title="重做">↪</button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => execCmd("bold")} className="tb-btn font-bold" title="粗体">B</button>
              <button onClick={() => execCmd("italic")} className="tb-btn italic" title="斜体">I</button>
              <button onClick={() => execCmd("underline")} className="tb-btn" title="下划线"><u>U</u></button>
              <button onClick={() => execCmd("strikeThrough")} className="tb-btn" title="删除线"><s>S</s></button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <div className="relative">
                <button onClick={() => { setShowHeading(prev => !prev); setShowFontSize(false); setShowColor(false); setShowBgColor(false); }} className="tb-btn" title="标题"><span className="text-[10px] font-bold">H</span></button>
                {showHeading && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[100px] animate-fade-in">
                    <button onClick={() => { execCmd("formatBlock","<h1>"); setShowHeading(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 text-slate-700">标题 1</button>
                    <button onClick={() => { execCmd("formatBlock","<h2>"); setShowHeading(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 text-slate-700">标题 2</button>
                    <button onClick={() => { execCmd("formatBlock","<h3>"); setShowHeading(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 text-slate-700">标题 3</button>
                    <button onClick={() => { execCmd("formatBlock","<h4>"); setShowHeading(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 text-slate-700">标题 4</button>
                    <button onClick={() => { execCmd("formatBlock","<p>"); setShowHeading(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 text-slate-700">正文</button>
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <div className="relative">
                <button onClick={() => { setShowFontSize(prev => !prev); setShowHeading(false); setShowColor(false); setShowBgColor(false); }} className="tb-btn text-[10px]" title="字号">Aa</button>
                {showFontSize && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[70px] max-h-36 overflow-y-auto animate-fade-in">
                    {FONT_SIZES.map((s) => (
                      <button key={s} onClick={() => { handleFontSize(s); setShowFontSize(false); }}
                        className="block w-full text-left px-3 py-1 text-sm hover:bg-slate-100 text-slate-700">{s}px</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => { setShowColor(prev => !prev); setShowHeading(false); setShowFontSize(false); setShowBgColor(false); }} className="tb-btn" title="文字颜色">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4L4 20h4l1.5-4h9L20 20h4L13 4h-2zM9.5 13L12 7l2.5 6"/></svg>
                </button>
                {showColor && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-lg p-2 animate-fade-in">
                    <div className="grid grid-cols-8 gap-1">
                      {["#000","#434343","#666","#999","#b7b7b7","#ccc","#d9d9d9","#fff","#e53e3e","#dd6b20","#d69e2e","#38a169","#319795","#3182ce","#5a67d8","#805ad5","#ffb3b3","#ffd699","#ffecb3","#b3ffcc","#b3ecff","#b3c2ff","#d4b3ff","#ffb3ec"].map(c => (
                        <button key={c} onClick={() => { handleColor(c); setShowColor(false); }} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform" style={{backgroundColor:c}} title={c}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => { setShowBgColor(prev => !prev); setShowHeading(false); setShowFontSize(false); setShowColor(false); }} className="tb-btn" title="背景色">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </button>
                {showBgColor && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-lg p-2 animate-fade-in">
                    <div className="grid grid-cols-8 gap-1">
                      {["#ffffcc","#d9f2d9","#d9e6f2","#e6d9f2","#f2d9d9","#f2eed9","#d9f2f2","#f2d9f2","#ffd9b3","#b3d9ff","#ffb3b3","#b3ffb3","#ffff99","#cc99ff","#99ccff","#ff99cc"].map(c => (
                        <button key={c} onClick={() => { handleBgColor(c); setShowBgColor(false); }} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform" style={{backgroundColor:c}} title={c}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => execCmd("justifyLeft")} className="tb-btn" title="左对齐"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg></button>
              <button onClick={() => execCmd("justifyCenter")} className="tb-btn" title="居中"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="18" y1="14" x2="6" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg></button>
              <button onClick={() => execCmd("justifyRight")} className="tb-btn" title="右对齐"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg></button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => execCmd("insertUnorderedList")} className="tb-btn" title="无序列表"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg></button>
              <button onClick={() => execCmd("insertOrderedList")} className="tb-btn" title="有序列表"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => execCmd("formatBlock","<blockquote>")} className="tb-btn" title="引用">❝</button>
              <button onClick={() => execCmd("formatBlock","<pre>")} className="tb-btn font-mono text-xs" title="代码块">&gt;_</button>
              <button onClick={createTable} className="tb-btn" title="插入表格"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg></button>
              <button onClick={handleImage} className="tb-btn" title="插入图片">🖼</button>
              <button onClick={handleLink} className="tb-btn" title="插入链接">🔗</button>
              <button onClick={() => execCmd("insertHorizontalRule")} className="tb-btn" title="分割线">—</button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={() => execCmd("removeFormat")} className="tb-btn" title="清除格式"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4h10l-3 9M12 18l-2 3"/><line x1="4" y1="4" x2="20" y2="20"/></svg></button>
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
              <div className="absolute bottom-3 right-4 text-[11px] text-slate-400 select-none pointer-events-none bg-white/80 px-2 py-0.5 rounded shadow-sm">
                字数：{getWordCount()}
              </div>
            </div>
          </>
        )}
      </div>

      {!subSidebarOpen && (<SubToggle />)}

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

      <style dangerouslySetInnerHTML={{ __html: "@keyframes fade-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fade-in .15s ease-out}.tb-btn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;font-size:12px;color:#475569;transition:all .15s;flex-shrink:0;cursor:pointer;background:none;border:none;padding:0;outline:none}.tb-btn:hover{background-color:#f1f5f9;color:#1e40af}" }} />

    </div>
  );
}