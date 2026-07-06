import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "64"];
const SAVE_DELAY = 2000;

function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm hover:bg-slate-100 transition-colors ${active ? "bg-slate-200 text-blue-700" : "text-slate-600"}`}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <div className="w-px h-5 bg-slate-200 shrink-0" />;
}

export default function DocEditor() {
  const { notebookId, docId } = useParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number>(0);
  const [doc, setDoc] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saveStatus, setSaveStatus] = useState<"" | "保存中..." | "已保存">("");
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showHeading, setShowHeading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  async function load() {
    const d = await api.getDoc(Number(docId));
    setDoc(d);
    setTitle(d.title);
    setContent(d.content || "");
    setSelectedTagIds(d.tags?.map((t: any) => t.id) || []);
    const tags = await api.listTags();
    setAllTags(tags);
  }

  useEffect(() => { if (docId) { load(); } }, [docId]);

  useEffect(() => {
    if (editorRef.current && content && !saveTimerRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [docId, doc]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) setShowFontSize(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColor(false);
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) setShowBgColor(false);
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setShowHeading(false);
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowShare(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
  }, []);

  // --- Auto-save ---
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const htmlContent = editorRef.current?.innerHTML || "";
      setSaveStatus("保存中...");
      try {
        const updated = await api.updateDoc(Number(docId), {
          title,
          content: htmlContent,
          tag_ids: selectedTagIds,
        });
        setDoc(updated);
        setContent(htmlContent);
        setSaveStatus("已保存");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch {
        setSaveStatus("");
      }
    }, SAVE_DELAY);
  }, [title, selectedTagIds, docId]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave();
  }, [scheduleSave]);

  const handleEditorInput = useCallback(() => {
    scheduleSave();
  }, [scheduleSave]);

  function execCommand(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleFontSize(size: string) {
    execCommand("fontSize", size);
    setShowFontSize(false);
  }

  function handleHeading(tag: string) {
    document.execCommand("formatBlock", false, `<${tag}>`);
    setShowHeading(false);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleColor(color: string) {
    execCommand("foreColor", color);
    setShowColor(false);
  }

  function handleBgColor(color: string) {
    execCommand("hiliteColor", color);
    setShowBgColor(false);
  }

  function handleLink() {
    const url = prompt("输入链接地址：", "https://");
    if (url) execCommand("createLink", url);
  }

  function handleImage() {
    const url = prompt("输入图片地址：", "https://");
    if (url) execCommand("insertImage", url);
  }

  function getShareUrl() {
    return `${window.location.origin}/kb/${notebookId}/doc/${docId}`;
  }

  async function togglePublic() {
    const updated = await api.updateDoc(Number(docId), { is_public: !doc.is_public });
    setDoc(updated);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  async function handleManualSave() {
    const htmlContent = editorRef.current?.innerHTML || "";
    setSaveStatus("保存中...");
    try {
      const updated = await api.updateDoc(Number(docId), { title, content: htmlContent, tag_ids: selectedTagIds });
      setDoc(updated);
      setContent(htmlContent);
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("");
    }
  }

  async function toggleTag(tagId: number) {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(next);
    scheduleSave();
  }

  function getWordCount() {
    const text = editorRef.current?.innerText || "";
    return text.replace(/\s/g, "").length;
  }

  if (!docId) return null;

  return (
    <div className="flex flex-col h-full">
      {/* ===== 顶部工具栏 ===== */}
      <div className="px-3 py-2 border-b bg-white flex items-center gap-1 shrink-0 overflow-x-auto">
        {/* 标题/段落 */}
        <div className="relative" ref={headingRef}>
          <ToolBtn onClick={() => setShowHeading(!showHeading)} title="段落/标题">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4v16M18 4v16M6 12h12" /></svg>
          </ToolBtn>
          {showHeading && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[120px] overflow-hidden">
              {["H1", "H2", "H3", "H4", "P"].map((tag) => (
                <button key={tag} className="w-full px-3 py-1.5 text-sm text-left hover:bg-slate-50 text-slate-700" onClick={() => handleHeading(tag === "P" ? "p" : tag)}>
                  {tag === "H1" ? "标题 1" : tag === "H2" ? "标题 2" : tag === "H3" ? "标题 3" : tag === "H4" ? "标题 4" : "正文"}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolDivider />

        {/* 字号 */}
        <div className="relative" ref={fontSizeRef}>
          <ToolBtn onClick={() => setShowFontSize(!showFontSize)} title="字号">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
          </ToolBtn>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 grid grid-cols-4 min-w-[160px] p-1" ref={fontSizeRef}>
              {FONT_SIZES.map((s) => (
                <button key={s} className="px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-600" onClick={() => handleFontSize(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>

        <ToolDivider />

        {/* 粗体 */}
        <ToolBtn onClick={() => execCommand("bold")} title="粗体 (Ctrl+B)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
        </ToolBtn>

        {/* 斜体 */}
        <ToolBtn onClick={() => execCommand("italic")} title="斜体 (Ctrl+I)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
        </ToolBtn>

        {/* 下划线 */}
        <ToolBtn onClick={() => execCommand("underline")} title="下划线 (Ctrl+U)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
        </ToolBtn>

        {/* 删除线 */}
        <ToolBtn onClick={() => execCommand("strikeThrough")} title="删除线">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><path d="M16 6.5C16 4 14 3 12 3s-4 1-4 3.5c0 1.5 1.2 2.5 4 3.5 2.8 1 4 2.5 4 5 0 2.5-2 3.5-4 3.5s-4-1-4-3.5" /></svg>
        </ToolBtn>

        <ToolDivider />

        {/* 文字颜色 */}
        <div className="relative" ref={colorRef}>
          <ToolBtn onClick={() => setShowColor(!showColor)} title="文字颜色">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          </ToolBtn>
          {showColor && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 p-2 grid grid-cols-8 gap-1">
              {["#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800","#ff5722"].map((c) => (
                <button key={c} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => handleColor(c)} />
              ))}
            </div>
          )}
        </div>

        {/* 背景颜色 */}
        <div className="relative" ref={bgColorRef}>
          <ToolBtn onClick={() => setShowBgColor(!showBgColor)} title="背景颜色">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          </ToolBtn>
          {showBgColor && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 p-2 grid grid-cols-8 gap-1">
              {["#ffffff","#f2f2f2","#fce8e8","#fce4d6","#fff2cc","#d9ead3","#d0e0f0","#d9d9d9","#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800","#ff5722"].map((c) => (
                <button key={c} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => handleBgColor(c)} />
              ))}
            </div>
          )}
        </div>

        <ToolDivider />

        {/* 链接 */}
        <ToolBtn onClick={handleLink} title="插入链接">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </ToolBtn>

        {/* 图片 */}
        <ToolBtn onClick={handleImage} title="插入图片">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
        </ToolBtn>

        {/* 分享 */}
        <div className="relative" ref={shareRef}>
          <ToolBtn onClick={() => setShowShare(!showShare)} title="分享">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          </ToolBtn>
          {showShare && doc && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 w-72 p-4" ref={shareRef}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">分享文档</h3>
                <button onClick={() => setShowShare(false)} className="text-slate-400 hover:text-slate-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">公开访问</span>
                <button
                  onClick={togglePublic}
                  className={`relative w-10 h-5 rounded-full transition-colors ${doc.is_public ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${doc.is_public ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              {doc.is_public ? (
                <div>
                  <div className="text-xs text-slate-500 mb-1">分享链接</div>
                  <div className="flex gap-1">
                    <input
                      className="flex-1 text-xs border rounded px-2 py-1.5 bg-slate-50 text-slate-600 truncate outline-none"
                      value={getShareUrl()}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyShareLink}
                      className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">开启后即可通过链接分享此文档</div>
              )}
            </div>
          )}
        </div>

        <ToolDivider />

        {/* 对齐 */}
        <ToolBtn onClick={() => execCommand("justifyLeft")} title="左对齐">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("justifyCenter")} title="居中">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="18" y1="14" x2="6" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("justifyRight")} title="右对齐">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="7" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
        </ToolBtn>

        {/* 无序列表 */}
        <ToolBtn onClick={() => execCommand("insertUnorderedList")} title="无序列表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        </ToolBtn>

        {/* 有序列表 */}
        <ToolBtn onClick={() => execCommand("insertOrderedList")} title="有序列表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>
        </ToolBtn>

        <ToolDivider />

        {/* 引用 */}
        <ToolBtn onClick={() => execCommand("formatBlock", "<blockquote>")} title="引用">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
        </ToolBtn>

        {/* 代码块 */}
        <ToolBtn onClick={() => execCommand("formatBlock", "<pre>")} title="代码块">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
        </ToolBtn>
      </div>

      {/* ===== 标题栏 & 保存状态 ===== */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0">
        <Link to={`/kb/${notebookId}`} className="text-slate-400 hover:text-slate-600 flex items-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Link>
        <input
          className="flex-1 text-lg font-semibold border-none outline-none bg-transparent min-w-0"
          value={title}
          onChange={handleTitleChange}
          placeholder="文档标题"
        />
        {saveStatus && (
          <span className={`text-xs shrink-0 transition-opacity ${saveStatus === "已保存" ? "text-green-600" : "text-slate-400"}`}>
            {saveStatus}
          </span>
        )}
        <div className="flex gap-2 items-center shrink-0">
          <div className="flex gap-1">
            {allTags.map((t: any) => (
              <button key={t.id} onClick={() => toggleTag(t.id)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${selectedTagIds.includes(t.id) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t.name}
              </button>
            ))}
          </div>
          <button onClick={handleManualSave} className="text-xs border px-2 py-1 rounded hover:bg-slate-100 text-slate-600 transition-colors shrink-0">
            💾 保存
          </button>
        </div>
      </div>

      {/* ===== 编辑器 ===== */}
      <div className="flex-1 overflow-auto bg-white relative">
        <div
          ref={editorRef}
          className="w-full h-full p-6 pb-10 max-w-3xl mx-auto outline-none text-base leading-relaxed"
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          style={{ minHeight: "100%" }}
          data-placeholder="开始写笔记..."
        />
        <div className="absolute bottom-2 left-4 text-[11px] text-slate-400 select-none pointer-events-none">
          <span>字数：{getWordCount()}</span>
        </div>
      </div>
    </div>
  );
}
