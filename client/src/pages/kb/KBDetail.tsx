import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../../api/client";
import { useSidebar } from "../../contexts/SidebarContext";
import { mdToHtml, htmlToMd } from "../../utils/markdown";
import VirtualTree from "../../components/VirtualTree";
import { DetailSkeleton } from "../../components/skeleton/Skeletons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useMutationToast } from "../../components/ui/toast";
import { useAutosaveDraft } from "../../hooks/useAutosaveDraft";
import { useKbNote, useKbTree, usePrefetchKbNote, useTags } from "../../hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BookOpen,
  Braces,
  Code2,
  Columns2,
  Eye,
  FileText,
  FolderPlus,
  Highlighter,
  ImageIcon,
  Link2,
  List,
  ListOrdered,
  Minus,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Table2,
  Type,
  Undo2,
  X,
} from "lucide-react";

const CREATE_OPTIONS = [
  { type: "text", label: "新建文档", icon: FileText, desc: "创建富文本文档", mime: "text/html" },
  { type: "code", label: "新建代码", icon: Code2, desc: "创建代码片段", mime: "text/plain" },
  { type: "book", label: "新建文件夹", icon: FolderPlus, desc: "创建子文件夹分类" },
  { type: "mermaid", label: "新建图表", icon: Rows3, desc: "创建 Mermaid 图表", mime: "text/mermaid" },
  { type: "relation-map", label: "新建关系图", icon: Network, desc: "创建可视化关系图" },
];

const FONT_SIZES = ["12","14","16","18","20","24","28","32","36","48","64"];
const SAVE_DELAY = 2000;

export default function KBDetail() {
  // noteId = current book/container, docId = document being edited (optional)
  const { noteId: notebookId, docId } = useParams();
  const currentDocId = docId || null;
  const activeNoteId = currentDocId || notebookId || "";

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const prefetchKbNote = usePrefetchKbNote();
  const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const { data: note, isLoading: loading } = useKbNote(activeNoteId);
  const { data: tree = [] } = useKbTree(notebookId);
  const { data: allTags = [] } = useTags();
  const isBook = note?.type === "book" && !currentDocId;
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
  const [editorMode, setEditorMode] = useState<"rich" | "markdown">("rich");
  const [markdownViewMode, setMarkdownViewMode] = useState<"edit" | "split" | "preview">("split");
  const [newTitle, setNewTitle] = useState("");
  const [mdText, setMdText] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [noteTags, setNoteTags] = useState<any[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [insertDialog, setInsertDialog] = useState<null | "image" | "link" | "table">(null);
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const draft = useAutosaveDraft(
    `draft:kb:${activeNoteId || "none"}`,
    { title, content, mdText, editorMode },
    hasLocalChanges && !!activeNoteId && !isBook
  );

  // Refs to avoid stale closures in save timer
  const titleRef = useRef(title);
  titleRef.current = title;
  const contentRef = useRef(content);
  contentRef.current = content;
  const mdTextRef = useRef(mdText);
  mdTextRef.current = mdText;
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;
  const editorModeRef = useRef(editorMode);
  editorModeRef.current = editorMode;

  useEffect(() => {
    // Clear any pending save when navigating to a different note
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = 0;
    }
    setSaveStatus("");
    setHasLocalChanges(false);
    if (activeNoteId) {
      setSubSidebarOpen(true);
    }
  }, [activeNoteId, notebookId]);

  useEffect(() => {
    if (!note) return;
    const saved = draft.readDraft();
    setTitle(saved?.title ?? note.title ?? "");
    const nextContent = saved?.content ?? note.content ?? "";
    setContent(nextContent);
    setMdText(saved?.mdText ?? htmlToMd(nextContent));
    if (saved?.editorMode) setEditorMode(saved.editorMode);
  }, [note?.noteId]);
  
  // Load tags when note changes
  useEffect(() => {
    if (activeNoteId && !isBook) {
      api.kb.getNoteTags(activeNoteId).then(setNoteTags).catch(() => {});
    }
  }, [activeNoteId, isBook]);

  async function handleAddTag(tagId: number) {
    try {
      await api.kb.addNoteTag(activeNoteId, tagId);
      const tags = await api.kb.getNoteTags(activeNoteId);
      setNoteTags(tags);
    } catch { toast.error("添加标签失败"); }
    setShowTagPicker(false);
  }

  async function handleRemoveTag(tagId: number) {
    try {
      await api.kb.removeNoteTag(activeNoteId, tagId);
      setNoteTags(prev => prev.filter(t => t.id !== tagId));
    } catch { toast.error("移除标签失败"); }
  }

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

  useEffect(() => {
    function handleToolbarClick(e: MouseEvent) {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setShowHeading(false);
      setShowFontSize(false);
      setShowColor(false);
      setShowBgColor(false);
    }
    if (showHeading || showFontSize || showColor || showBgColor) {
      document.addEventListener("mousedown", handleToolbarClick);
    }
    return () => document.removeEventListener("mousedown", handleToolbarClick);
  }, [showHeading, showFontSize, showColor, showBgColor]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setHasLocalChanges(true);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const currentId = activeNoteIdRef.current;
      const currentTitle = titleRef.current;
      const htmlContent = isBook ? undefined : (
        editorModeRef.current === "markdown"
          ? mdToHtml(mdTextRef.current)
          : (editorRef.current?.innerHTML || "")
      );
      setSaveStatus("保存中...");
      try {
        const data: any = { title: currentTitle };
        if (htmlContent !== undefined) data.content = htmlContent;
        await api.kb.updateContent(currentId, data);
        if (htmlContent !== undefined) setContent(htmlContent);
        draft.clearDraft();
        setHasLocalChanges(false);
        queryClient.invalidateQueries({ queryKey: ["kb-note", currentId] });
        queryClient.invalidateQueries({ queryKey: ["kb-tree", notebookId] });
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

  function saveEditorSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreEditorSelection() {
    const range = savedRangeRef.current;
    if (!range || !editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function handleHeading(tag: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      // Walk up to find the nearest block element
      while (node && node !== editorRef.current && node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      if (node && node !== editorRef.current) {
        const heading = document.createElement(tag);
        heading.innerHTML = (node as HTMLElement).innerHTML;
        (node as HTMLElement).parentNode?.replaceChild(heading, node);
        // Move cursor into the heading
        const newRange = document.createRange();
        newRange.setStart(heading, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
    setShowHeading(false);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }
  /**
   * 手动扩展选区到"词"边界，兼容中英文混排。
   * Selection.modify("word") 在中文字符上只选中一个字，这里用非空格连续字符作为词。
   */
  function expandCollapsedRange(range: Range): boolean {
    if (!range.collapsed) return true; // 已有选区，不处理
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const text = node.textContent || "";
    const offset = range.startOffset;
    if (offset >= text.length && offset > 0) {
      // 光标在文本末尾，向前选一个字
      range.setStart(node, offset - 1);
      range.setEnd(node, offset);
      return true;
    }
    if (offset >= text.length) return false;
    let start = offset;
    let end = offset;
    // 向前扩展到非空白字符边界
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    // 向后扩展到非空白字符边界
    while (end < text.length && !/\s/.test(text[end])) end++;
    if (start === end) return false;
    range.setStart(node, start);
    range.setEnd(node, end);
    return true;
  }

  /** 把 inline style 应用到当前选区 */
  function applyInlineStyle(style: Record<string, string>): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return false;
    const range = sel.getRangeAt(0);
    expandCollapsedRange(range);
    if (range.collapsed) return false;
    try {
      const span = document.createElement("span");
      Object.assign(span.style, style);
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      // 光标移到 span 后面
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
      return true;
    } catch {
      return false;
    }
  }

  function handleFontSize(size: string) {
    restoreEditorSelection();
    applyInlineStyle({ fontSize: size + "px" });
    setShowFontSize(false);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }

  function handleColor(color: string) {
    restoreEditorSelection();
    if (!applyInlineStyle({ color })) {
      document.execCommand("foreColor", false, color);
    }
    setShowColor(false);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }

  function handleBgColor(color: string) {
    restoreEditorSelection();
    if (!applyInlineStyle({ backgroundColor: color })) {
      document.execCommand("backColor", false, color);
    }
    setShowBgColor(false);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }

  async function handleShare() {
    if (!currentDocId) return;
    try {
      const result = await api.shareNote(currentDocId);
      setShareToken(result.share_token);
      setShowShareModal(true);
    } catch {
      toast.error("分享失败");
    }
  }

  async function handleUnshare() {
    if (!currentDocId) return;
    try {
      await api.unshareNote(currentDocId);
      setShareToken(null);
      setShowShareModal(false);
    } catch {
      toast.error("取消分享失败");
    }
  }


  function closeInsertDialog() {
    setInsertDialog(null);
    setImageUrl("");
    setLinkUrl("");
    setTableRows("3");
    setTableCols("3");
  }

  function handleInsertSubmit(e: React.FormEvent) {
    e.preventDefault();
    restoreEditorSelection();
    if (insertDialog === "image") {
      const url = imageUrl.trim();
      if (url) execCmd("insertImage", url);
      closeInsertDialog();
      return;
    }
    if (insertDialog === "link") {
      const url = linkUrl.trim();
      if (url) execCmd("createLink", url);
      closeInsertDialog();
      return;
    }
    if (insertDialog === "table") {
      const rows = Math.max(1, Math.min(20, Number.parseInt(tableRows, 10) || 3));
      const cols = Math.max(1, Math.min(12, Number.parseInt(tableCols, 10) || 3));
      let html = "<table style='border-collapse:collapse;width:100%;margin:0.75em 0'>";
      for (let r = 0; r < rows; r++) {
        html += "<tr>";
        for (let c = 0; c < cols; c++) {
          html += "<td style='padding:8px;border:1px solid #cbd5e1'>&nbsp;</td>";
        }
        html += "</tr>";
      }
      html += "</table>";
      document.execCommand("insertHTML", false, html);
      if (editorRef.current) editorRef.current.focus();
      scheduleSave();
      closeInsertDialog();
    }
  }

  function getWordCount() {
    if (editorMode === "markdown") return mdText.replace(/\s/g, "").length;
    return (editorRef.current?.innerText || "").replace(/\s/g, "").length;
  }

  async function handleCreate() {
    if (!newTitle.trim() || !notebookId) return;
    const opt = CREATE_OPTIONS.find((o) => o.type === createType)!;
    try {
      const result = await api.kb.createNote(notebookId, newTitle.trim(), "", createType, opt.mime);
      setNewTitle(""); setShowCreateModal(false); setShowCreateMenu(false);
      queryClient.invalidateQueries({ queryKey: ["kb-tree", notebookId] });
      if (createType === "text" || createType === "code" || createType === "mermaid") {
        navigate(`/kb/${notebookId}/doc/${result.note.noteId}`);
      }
    } catch {
      toast.error("创建失败");
    }
  }

  function openCreateModal(type: string) {
    setCreateType(type);
    setNewTitle(CREATE_OPTIONS.find((o) => o.type === type)?.label || "新项目");
    setShowCreateMenu(false);
    setShowCreateModal(true);
  }

  function handleTreeSelect(item: any) {
    if (item.type === "book") navigate(`/kb/${item.noteId}`);
    else navigate(`/kb/${notebookId}/doc/${item.noteId}`);
  }

  function openInsertDialog(type: "image" | "link" | "table") {
    saveEditorSelection();
    setInsertDialog(type);
    setShowHeading(false);
    setShowFontSize(false);
    setShowColor(false);
    setShowBgColor(false);
  }
  

  if (loading) return <DetailSkeleton />;
  if (!note) return <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">笔记不存在</div>;

  function SubToggle() {
    return (
      <button onClick={toggleSubSidebar}
        className="absolute left-0 z-30 top-14 hidden h-8 w-6 items-center justify-center rounded-r border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-200 md:flex"
        title={subSidebarOpen ? "收起目录" : "展开目录"}>
        {subSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
      </button>
    );
  }

  return (
    <div className="app-surface-bg relative flex h-full text-slate-950">
      {/* Sub-sidebar: Note Tree */}
      <div className="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-white/80 bg-white/82 shadow-[8px_0_28px_rgba(15,23,42,0.04)] backdrop-blur transition-all duration-200"
        style={{ width: subSidebarOpen ? "16rem" : "0rem", minWidth: subSidebarOpen ? "16rem" : "0rem" }}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100/80 bg-white/60 px-4 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <BookOpen size={16} />
            </span>
            <span className="truncate text-sm font-semibold text-slate-950">{note.title}</span>
          </div>
          <button onClick={() => navigate("/kb")} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="返回">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="relative px-3 pb-2 pt-3" ref={menuRef}>
            <button onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950">
              <Plus size={16} />
              <span>新建</span>
            </button>
            <AnimatePresence>
            {showCreateMenu && (
              <motion.div
                className="absolute left-3 right-3 top-full z-40 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
              >
                {CREATE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <motion.button key={opt.type} onClick={() => openCreateModal(opt.type)}
                      whileHover={{ x: 3 }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-slate-50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800">{opt.label}</div>
                        <div className="text-xs text-slate-400 truncate">{opt.desc}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
          <div className="h-full py-1">
            {tree.length === 0 ? (
              <div className="mx-3 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs leading-5 text-slate-400">暂无内容<br />点击上方新建</div>
            ) : (
              <VirtualTree
                items={tree}
                activeId={activeNoteId}
                onSelect={handleTreeSelect}
                onPrefetch={(item) => prefetchKbNote(item.noteId)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        {isBook ? (
          <div className="flex flex-1 items-center justify-center p-8 text-slate-400">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-10 py-12 text-center shadow-[0_18px_54px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <BookOpen size={26} />
              </div>
              <div className="mb-2 text-lg font-semibold text-slate-800">{note.title}</div>
              <div className="text-sm">选择一个笔记开始编辑，或点击左侧「新建」创建新内容</div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div ref={dropdownRef} className="flex h-12 shrink-0 select-none items-center gap-1 border-b border-slate-200/80 bg-white/88 px-3 py-2 shadow-sm backdrop-blur">
              {/* 基础格式按钮（可横向滚动） */}
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
                <button onClick={() => execCmd("undo")} className="tb-btn" title="撤销"><Undo2 size={14} /></button>
                <button onClick={() => execCmd("redo")} className="tb-btn" title="重做"><Redo2 size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                <button onClick={() => execCmd("bold")} className="tb-btn font-bold" title="粗体">B</button>
                <button onClick={() => execCmd("italic")} className="tb-btn italic" title="斜体">I</button>
                <button onClick={() => execCmd("underline")} className="tb-btn" title="下划线"><u>U</u></button>
                <button onClick={() => execCmd("strikeThrough")} className="tb-btn" title="删除线"><s>S</s></button>
                <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                <button onClick={() => execCmd("justifyLeft")} className="tb-btn" title="左对齐"><AlignLeft size={14} /></button>
                <button onClick={() => execCmd("justifyCenter")} className="tb-btn" title="居中"><AlignCenter size={14} /></button>
                <button onClick={() => execCmd("justifyRight")} className="tb-btn" title="右对齐"><AlignRight size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                <button onClick={() => execCmd("insertUnorderedList")} className="tb-btn" title="无序列表"><List size={14} /></button>
                <button onClick={() => execCmd("insertOrderedList")} className="tb-btn" title="有序列表"><ListOrdered size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                <button onClick={() => execCmd("formatBlock","<blockquote>")} className="tb-btn" title="引用"><Quote size={14} /></button>
                <button onClick={() => execCmd("formatBlock","<pre>")} className="tb-btn" title="代码块"><Braces size={14} /></button>
                <button onClick={() => openInsertDialog("table")} className="tb-btn" title="插入表格"><Table2 size={14} /></button>
                <button onClick={() => openInsertDialog("image")} className="tb-btn" title="插入图片"><ImageIcon size={14} /></button>
                <button onClick={() => openInsertDialog("link")} className="tb-btn" title="插入链接"><Link2 size={14} /></button>
                <button onClick={() => execCmd("insertHorizontalRule")} className="tb-btn" title="分割线"><Minus size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                <button onClick={() => execCmd("removeFormat")} className="tb-btn" title="清除格式"><RemoveFormatting size={14} /></button>
              </div>

              {/* 下拉菜单触发器（必须在 overflow 外层，否则 absolute 面板被裁剪） */}
              <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
              <div className="relative shrink-0">
                <button onClick={() => { setShowHeading(prev => !prev); setShowFontSize(false); setShowColor(false); setShowBgColor(false); }} className="tb-btn" title="标题"><Type size={14} /></button>
                <AnimatePresence>
                  {showHeading && (
                    <motion.div
                      className="absolute left-0 top-full z-50 mt-2 min-w-[112px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {[
                        ["<h1>", "标题 1"],
                        ["<h2>", "标题 2"],
                        ["<h3>", "标题 3"],
                        ["<h4>", "标题 4"],
                        ["<p>", "正文"],
                      ].map(([tag, label]) => (
                        <button key={tag} onClick={() => { execCmd("formatBlock", tag); setShowHeading(false); }} className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative shrink-0">
                <button onClick={() => { saveEditorSelection(); setShowFontSize(prev => !prev); setShowHeading(false); setShowColor(false); setShowBgColor(false); }} className="tb-btn text-[10px]" title="字号">Aa</button>
                <AnimatePresence>
                  {showFontSize && (
                    <motion.div
                      className="absolute left-0 top-full z-50 mt-2 max-h-44 min-w-[82px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {FONT_SIZES.map((s) => (
                        <button key={s} onClick={() => { handleFontSize(s); setShowFontSize(false); }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">{s}px</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative shrink-0">
                <button onClick={() => { saveEditorSelection(); setShowColor(prev => !prev); setShowHeading(false); setShowFontSize(false); setShowBgColor(false); }} className="tb-btn" title="文字颜色">
                  <Type size={14} />
                </button>
                <AnimatePresence>
                  {showColor && (
                    <motion.div
                      className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="grid grid-cols-8 gap-6">
                        {["#000","#434343","#666","#999","#b7b7b7","#ccc","#d9d9d9","#fff","#e53e3e","#dd6b20","#d69e2e","#38a169","#319795","#3182ce","#5a67d8","#805ad5","#ffb3b3","#ffd699","#ffecb3","#b3ffcc","#b3ecff","#b3c2ff","#d4b3ff","#ffb3ec"].map(c => (
                          <button key={c} onClick={() => { handleColor(c); setShowColor(false); }} className="h-6 w-6 rounded-md border border-slate-200 transition hover:scale-110 hover:shadow-sm" style={{backgroundColor:c}} title={c}/>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative shrink-0">
                <button onClick={() => { saveEditorSelection(); setShowBgColor(prev => !prev); setShowHeading(false); setShowFontSize(false); setShowColor(false); }} className="tb-btn" title="背景色">
                  <Highlighter size={14} />
                </button>
                <AnimatePresence>
                  {showBgColor && (
                    <motion.div
                      className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="grid grid-cols-8 gap-6">
                        {["#ffffcc","#d9f2d9","#d9e6f2","#e6d9f2","#f2d9d9","#f2eed9","#d9f2f2","#f2d9f2","#ffd9b3","#b3d9ff","#ffb3b3","#b3ffb3","#ffff99","#cc99ff","#99ccff","#ff99cc"].map(c => (
                          <button key={c} onClick={() => { handleBgColor(c); setShowBgColor(false); }} className="h-6 w-6 rounded-md border border-slate-200 transition hover:scale-110 hover:shadow-sm" style={{backgroundColor:c}} title={c}/>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  if (editorMode === "markdown") {
                    const html = mdToHtml(mdText);
                    setContent(html);
                    setEditorMode("rich");
                    setTimeout(() => {
                      if (editorRef.current) editorRef.current.innerHTML = html;
                    }, 0);
                  } else {
                    const html = editorRef.current?.innerHTML || "";
                    setMdText(htmlToMd(html));
                    setEditorMode("markdown");
                  }
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  editorMode === "markdown"
                    ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                    : "border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
                title={editorMode === "markdown" ? "切换到富文本编辑" : "切换到 Markdown 编辑"}
              >
                <Braces size={13} />
                Markdown
              </button>
            </div>

            {/* Title bar */}
            <div className="shrink-0 border-b border-slate-200/80 bg-white/88 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
              <input className="min-w-0 flex-1 border-none bg-transparent text-xl font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300"
                value={title} onChange={handleTitleChange} placeholder="标题" />
              <AnimatePresence>
                {saveStatus && (
                  <motion.span
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${saveStatus === "已保存" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    {saveStatus}
                  </motion.span>
                )}
              </AnimatePresence>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {noteTags.map((t: any) => (
                  <motion.span key={t.id}
                    layout
                    initial={{ opacity: 0, y: -4, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.94 }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:opacity-80"
                    style={{ backgroundColor: t.color + "20", color: t.color }}
                    onClick={() => handleRemoveTag(t.id)}
                    title="点击移除">
                    {t.name}
                    <X size={10} strokeWidth={2.5} />
                  </motion.span>
                ))}
                <button onClick={() => setShowTagPicker(true)}
                  className="rounded px-1.5 py-0.5 text-xs text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
                  title="添加标签">
                  + 标签
                </button>
              </div>
            </div>
            {/* Editor */}
            <div className="relative flex-1 overflow-auto bg-transparent px-6 py-6">
              {editorMode === "rich" ? (
                <motion.div
                  ref={editorRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mx-auto min-h-full w-full max-w-4xl rounded-2xl border border-white/80 bg-white/96 p-8 pb-16 text-base leading-7 shadow-[0_18px_54px_rgba(15,23,42,0.08)] outline-none transition focus:border-slate-300 focus:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
                  contentEditable suppressContentEditableWarning onInput={handleEditorInput}
                  style={{ minHeight: "100%" }} data-placeholder="开始写笔记..." />
              ) : (
                <>
                  {/* Markdown 视图切换 */}
                  <div className="mx-auto mb-3 flex w-full max-w-4xl items-center gap-1">
                    <span className="mr-2 text-xs font-medium text-slate-400">视图</span>
                    <button
                      type="button"
                      onClick={() => setMarkdownViewMode("edit")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        markdownViewMode === "edit"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <Pencil size={13} />编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownViewMode("split")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        markdownViewMode === "split"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <Columns2 size={13} />分屏
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownViewMode("preview")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        markdownViewMode === "preview"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <Eye size={13} />预览
                    </button>
                  </div>

                  {markdownViewMode === "edit" ? (
                    <motion.textarea
                      key="md-edit"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mx-auto min-h-full w-full max-w-4xl resize-none rounded-lg border border-slate-200 bg-white p-8 pb-16 font-mono text-base leading-7 shadow-sm outline-none focus:ring-0"
                      value={mdText}
                      onChange={(e) => { setMdText(e.target.value); scheduleSave(); }}
                      style={{ minHeight: "100%" }}
                      placeholder="使用 Markdown 语法编写..."
                    />
                  ) : markdownViewMode === "split" ? (
                    <motion.div
                      key="md-split"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mx-auto grid min-h-full w-full max-w-[96rem] grid-cols-2 gap-4"
                      style={{ minHeight: "100%" }}
                    >
                      <textarea
                        className="min-h-full resize-none rounded-lg border border-slate-200 bg-white p-6 font-mono text-sm leading-7 shadow-sm outline-none focus:ring-0"
                        value={mdText}
                        onChange={(e) => { setMdText(e.target.value); scheduleSave(); }}
                        placeholder="使用 Markdown 语法编写..."
                      />
                      <div className="min-h-full overflow-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                        {mdText.trim() ? (
                          <MarkdownRenderer content={mdText} variant="agent" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-300">
                            在左侧输入 Markdown 即可预览
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="md-preview"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mx-auto min-h-full w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
                      style={{ minHeight: "100%" }}
                    >
                      {mdText.trim() ? (
                        <MarkdownRenderer content={mdText} variant="agent" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-300">
                          暂无内容，切换到「编辑」或「分屏」开始编写
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
              <div className="pointer-events-none absolute bottom-8 right-10 select-none rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-slate-400 shadow-sm ring-1 ring-slate-100">
                字数：{getWordCount()}
              </div>
            </div>
          </>
        )}
      </div>

      {!subSidebarOpen && (<SubToggle />)}

      <AnimatePresence>
        {insertDialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={closeInsertDialog}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleInsertSubmit}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {insertDialog === "image" ? "插入图片" : insertDialog === "link" ? "插入链接" : "插入表格"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {insertDialog === "table" ? "设置行列数后插入到当前光标位置。" : "内容会插入到当前编辑光标位置。"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeInsertDialog}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="关闭"
                >
                  <X size={16} />
                </button>
              </div>

              {insertDialog === "image" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">图片地址</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                    autoFocus
                  />
                </label>
              )}

              {insertDialog === "link" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">链接地址</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                  />
                </label>
              )}

              {insertDialog === "table" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">行数</span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      type="number"
                      min={1}
                      max={20}
                      value={tableRows}
                      onChange={(e) => setTableRows(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">列数</span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      type="number"
                      min={1}
                      max={12}
                      value={tableCols}
                      onChange={(e) => setTableCols(e.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeInsertDialog} className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100">
                  取消
                </button>
                <button type="submit" className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0">
                  插入
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

            {/* Tag Picker */}
      <AnimatePresence>
      {showTagPicker && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowTagPicker(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="mb-1 text-base font-semibold text-slate-950">选择标签</h3>
            <p className="mb-4 text-sm text-slate-500">为当前笔记添加一个标签。</p>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {allTags.filter((t: any) => !noteTags.find((nt: any) => nt.id === t.id)).length === 0 ? (
                <div className="w-full rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">没有可用的标签</div>
              ) : (
                allTags.filter((t: any) => !noteTags.find((nt: any) => nt.id === t.id)).map((t: any) => (
                  <motion.button key={t.id} onClick={() => handleAddTag(t.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:shadow-sm transition-all"
                    style={{ borderColor: t.color + "40", backgroundColor: t.color + "10", color: t.color }}>
                    {t.name}
                  </motion.button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowTagPicker(false)}
                className="rounded-lg px-4 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100">关闭</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      
      <AnimatePresence>
      {showShareModal && shareToken && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowShareModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="mb-1 text-lg font-semibold text-slate-950">分享笔记</h2>
            <div className="mb-4 text-sm text-slate-500">链接已生成，复制发送给他人即可查看。</div>
            <div className="flex gap-2">
              <input className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" readOnly value={window.location.origin + "/shared/" + shareToken} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/shared/" + shareToken); }} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">复制</button>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={handleUnshare} className="rounded-lg px-4 py-2 text-sm text-red-600 transition hover:bg-red-50">取消分享</button>
              <button onClick={() => setShowShareModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm transition hover:bg-slate-200">关闭</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {CREATE_OPTIONS.find((o) => o.type === createType)?.label}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">名称</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus required />
            </div>
            <DialogFooter className="gap-3 sm:space-x-0">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100">取消</button>
              <button type="submit" className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">创建</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: "@keyframes fade-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fade-in .15s ease-out}.tb-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;font-size:12px;color:#475569;transition:transform .16s ease,background-color .16s ease,color .16s ease,box-shadow .16s ease;flex-shrink:0;cursor:pointer;background:rgba(255,255,255,.6);border:1px solid transparent;padding:0;outline:none}.tb-btn:hover{transform:translateY(-1px);background-color:#fff;color:#0f172a;border-color:#e2e8f0;box-shadow:0 8px 20px rgba(15,23,42,.08)}.tb-btn:active{transform:translateY(0) scale(.96)}.tb-btn:focus-visible{box-shadow:0 0 0 2px #cbd5e1,0 8px 20px rgba(15,23,42,.08)}" }} />

    </div>
  );
}
