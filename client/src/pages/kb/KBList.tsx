import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArchiveRestore, BookOpen, FileText, Layers3, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { CardGridSkeleton } from "../../components/skeleton/Skeletons";
import { GooeyInput } from "../../components/ui/gooey-input";
import { useMutationToast } from "../../components/ui/toast";
import { useKbRoots, useKbTrash, usePrefetchKbNote } from "../../hooks/api";
import {
  EmptyState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
  TextAreaField,
  TextField,
} from "../../components/PageScaffold";
import { preloadPage } from "../../pageLoaders";

export default function KBList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const prefetchKbNote = usePrefetchKbNote();
  const { data: notes = [], isLoading: loading } = useKbRoots();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [densityFilter, setDensityFilter] = useState<"all" | "structured" | "plain">("all");
  const { data: trashItems = [], isLoading: trashLoading, refetch: refetchTrash } = useKbTrash(showTrash);

  const totalChildren = notes.reduce((sum: number, note: any) => sum + countChildren(note), 0);
  const recentlyUpdated = useMemo(() => {
    return [...notes]
      .filter((note: any) => note.dateModified)
      .sort((a: any, b: any) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime())[0];
  }, [notes]);
  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return notes.filter((note: any) => {
      const childrenCount = countChildren(note);
      if (densityFilter === "structured" && childrenCount === 0) return false;
      if (densityFilter === "plain" && childrenCount > 0) return false;
      if (!keyword) return true;
      return [note.title, note.content, note.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [notes, search, densityFilter]);

  async function handleDelete(noteId: string) {
    try {
      await api.kb.deleteNote(noteId);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["kb-roots"] });
      queryClient.invalidateQueries({ queryKey: ["kb-trash"] });
      toast.success("已删除知识库");
    } catch (err) {
      console.error("delete failed", err);
      toast.error("删除失败");
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const result = await api.kb.createNote("__root__", name.trim(), desc.trim(), "book");
      setName("");
      setDesc("");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["kb-roots"] });
      navigate(`/kb/${result.note.noteId}`);
    } catch {
      toast.error("创建失败");
    }
  }

  async function openTrash() {
    setShowTrash(true);
    refetchTrash();
  }

  async function restoreFromTrash(noteId: string) {
    try {
      await api.kb.restoreNote(noteId);
      queryClient.invalidateQueries({ queryKey: ["kb-trash"] });
      queryClient.invalidateQueries({ queryKey: ["kb-roots"] });
      toast.success("已恢复");
    } catch (err) {
      console.error("restore failed", err);
      toast.error("恢复失败");
    }
  }

  return (
    <PageShell
      title="知识库"
      description="管理笔记根目录、资料结构和回收站，后续可以进入知识库继续编辑正文。"
      actions={
        <>
          <SecondaryButton onClick={openTrash}>
            <Trash2 size={16} />
            回收站
          </SecondaryButton>
          <PrimaryButton onClick={() => { setName(""); setDesc(""); setShowModal(true); }}>
            <Plus size={16} />
            新建知识库
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="知识库" value={notes.length} hint="根目录数量" icon={BookOpen} tone="violet" />
        <MetricCard label="子节点" value={totalChildren} hint="已建立的内容结构" icon={Layers3} tone="blue" />
        <MetricCard label="最近更新" value={recentlyUpdated ? fmtDate(recentlyUpdated.dateModified) : "暂无"} hint={recentlyUpdated?.title || "还没有编辑记录"} icon={FileText} tone="emerald" />
      </div>

      {loading ? (
        <CardGridSkeleton cards={8} />
      ) : notes.length > 0 ? (
        <div className="space-y-4">
          <Surface className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-950">知识库入口</div>
              <div className="mt-1 text-xs text-slate-500">
                当前显示 {filteredNotes.length} / {notes.length} 个根目录
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:pb-0">
                <KbFilterChip active={densityFilter === "all"} onClick={() => setDensityFilter("all")}>全部</KbFilterChip>
                <KbFilterChip active={densityFilter === "structured"} onClick={() => setDensityFilter("structured")}>有结构</KbFilterChip>
                <KbFilterChip active={densityFilter === "plain"} onClick={() => setDensityFilter("plain")}>未展开</KbFilterChip>
              </div>
              <GooeyInput
                placeholder="搜索知识库..."
                collapsedLabel="搜索"
                value={search}
                onValueChange={setSearch}
                collapsedWidth={104}
                expandedWidth={250}
                expandedOffset={50}
                classNames={{
                  root: "justify-start sm:justify-end",
                  trigger: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900 hover:bg-slate-800",
                  bubbleSurface: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900",
                  input: "text-white placeholder:text-white/55",
                }}
              />
            </div>
          </Surface>

          {filteredNotes.length === 0 ? (
            <EmptyState title="没有匹配的知识库" description="换个关键词或切换筛选条件后再试。" icon={Search} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredNotes.map((note: any, index: number) => (
                <motion.div
                  key={note.noteId}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index * 0.035, 0.24), ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <span className="pointer-events-none absolute inset-x-5 top-0 h-px scale-x-0 bg-slate-950/40 transition duration-300 group-hover:scale-x-100" />
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <IconBadge icon={note.type === "book" ? BookOpen : FileText} tone="violet" />
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(note)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                      title="删除知识库"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="block w-full text-left"
                    onMouseEnter={() => {
                      preloadPage("kbDetail");
                      prefetchKbNote(note.noteId);
                    }}
                    onFocus={() => {
                      preloadPage("kbDetail");
                      prefetchKbNote(note.noteId);
                    }}
                    onClick={() => navigate(`/kb/${note.noteId}`)}
                  >
                    <h3 className="truncate text-base font-semibold text-slate-950 transition group-hover:text-violet-600">{note.title || "未命名"}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                      {note.content || note.description || "进入后补充章节、资料和正文。"}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                      <span>{countChildren(note)} 个子节点</span>
                      <span>{note.dateModified ? fmtDate(note.dateModified) : ""}</span>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="还没有知识库"
          description="创建一个知识库，用于归档课程笔记、资料和复习内容。"
          icon={BookOpen}
          action={<PrimaryButton onClick={() => setShowModal(true)}>创建第一个</PrimaryButton>}
        />
      )}

      <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e: any) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">新建知识库</h2>
                <p className="mt-1 text-sm text-slate-500">作为根目录创建，后续可继续添加子节点。</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={onCreate} className="space-y-3">
              <TextField placeholder="知识库名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              <TextAreaField placeholder="简要描述" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
              <div className="flex justify-end gap-3 pt-2">
                <SecondaryButton type="button" onClick={() => setShowModal(false)}>取消</SecondaryButton>
                <PrimaryButton type="submit">创建</PrimaryButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showTrash && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowTrash(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl"
            onClick={(e: any) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">回收站</h2>
                <p className="mt-1 text-sm text-slate-500">恢复误删的知识库节点。</p>
              </div>
              <button onClick={() => setShowTrash(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {trashLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                  <Search className="mr-2 h-4 w-4 animate-spin" />
                  加载中...
                </div>
              ) : trashItems.length === 0 ? (
                <EmptyState title="回收站是空的" icon={Trash2} />
              ) : (
                <div className="space-y-2">
                  {trashItems.map((item: any, index: number) => (
                    <motion.div
                      key={item.noteId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.035, 0.18) }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{item.title || "未命名"}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          删除于 {new Date(item.deletedAt).toLocaleString("zh-CN")}
                          {item.parentTitle ? <span> · 原位于 {item.parentTitle}</span> : null}
                        </div>
                      </div>
                      <SecondaryButton onClick={() => restoreFromTrash(item.noteId)} className="h-9 px-3 text-blue-600">
                        <ArchiveRestore size={15} />
                        恢复
                      </SecondaryButton>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {deleteTarget && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeleteTarget(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e: any) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">删除知识库</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">该操作会同时删除其所有子内容。</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-800">{deleteTarget.title || "未命名"}</div>
            <div className="mt-5 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setDeleteTarget(null)}>取消</SecondaryButton>
              <PrimaryButton type="button" className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300" onClick={() => handleDelete(deleteTarget.noteId)}>
                <Trash2 size={16} />
                删除
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </PageShell>
  );
}

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return value;
  }
}

function countChildren(note: any): number {
  return note.children ? note.children.length : 0;
}

function KbFilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
      }`}
    >
      {children}
    </motion.button>
  );
}
