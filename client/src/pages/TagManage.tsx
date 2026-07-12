import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Edit3, Palette, Plus, Search, Tags, Trash2, X } from "lucide-react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { GooeyInput } from "../components/ui/gooey-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  EmptyState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
  TextField,
} from "../components/PageScaffold";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#78716c",
];

export default function TagManage() {
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const { data: rawTags, isLoading: loading } = useTags(debounced || undefined);
  const tags = Array.isArray(rawTags) ? rawTags : [];
  const totalPosts = tags.reduce((sum: number, tag: any) => sum + Number(tag.post_count || 0), 0);
  const totalNotes = tags.reduce((sum: number, tag: any) => sum + Number(tag.note_count || 0), 0);

  const toast = useMutationToast();
  const createMut = useCreateTag();
  const updateMut = useUpdateTag();
  const deleteMut = useDeleteTag();

  function openCreate() {
    setEditingTag(null);
    setName("");
    setColor("#6366f1");
    setShowModal(true);
  }

  function openEdit(tag: any) {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    toast.start(editingTag ? "更新中..." : "创建中...");
    try {
      if (editingTag) {
        await updateMut.mutateAsync({ id: editingTag.id, data: { name: name.trim(), color } });
      } else {
        await createMut.mutateAsync({ name: name.trim(), color });
      }
      setShowModal(false);
      toast.success(editingTag ? "已更新标签" : "已创建标签");
    } catch (err: any) {
      toast.error(err.message || "操作失败");
    }
  }

  async function handleDelete(tag: any) {
    toast.start("删除中...");
    try {
      await deleteMut.mutateAsync(tag.id);
      setDeleteTarget(null);
      toast.success("已删除标签");
    } catch (err: any) {
      toast.error(err.message || "删除失败");
    }
  }

  return (
    <PageShell
      title="标签管理"
      description="统一管理帖子和知识库共用的标签，颜色会同步用于筛选和内容标记。"
      actions={
        <PrimaryButton onClick={openCreate}>
          <Plus size={16} />
          新建标签
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="标签数量" value={tags.length} hint="当前筛选结果" icon={Tags} tone="blue" />
        <MetricCard label="关联帖子" value={totalPosts} hint="所有标签累计" icon={Search} tone="violet" />
        <MetricCard label="关联笔记" value={totalNotes} hint="知识库标签使用量" icon={Palette} tone="emerald" />
      </div>

      <Surface className="p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">标签库</h2>
            <p className="mt-1 text-xs text-slate-500">搜索、编辑或删除现有标签。</p>
          </div>
          <GooeyInput
            placeholder="搜索标签..."
            collapsedLabel="搜索"
            value={search}
            onValueChange={setSearch}
            collapsedWidth={118}
            expandedWidth={260}
            expandedOffset={58}
            bubbleOffsetY={0}
            classNames={{
              root: "justify-start",
              trigger: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900 hover:bg-slate-800",
              bubbleSurface: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900",
              input: "text-white placeholder:text-white/55",
            }}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <EmptyState title={search ? "没有匹配的标签" : "暂无标签"} description={search ? "换个关键词试试。" : "创建标签后可以用于帖子和知识库筛选。"} icon={Tags} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
            {tags.map((tag: any, index: number) => (
              <motion.div
                key={tag.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.2), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <span className="pointer-events-none absolute inset-x-4 top-0 h-px scale-x-0 transition duration-300 group-hover:scale-x-100" style={{ backgroundColor: tag.color }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <motion.span
                      className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/5"
                      style={{ backgroundColor: tag.color }}
                      whileHover={{ rotate: 4, scale: 1.06 }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{tag.name}</div>
                      <div className="mt-1 text-xs text-slate-400">{tag.color}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => openEdit(tag)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="编辑">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => setDeleteTarget(tag)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-400">帖子</div>
                    <div className="mt-1 font-semibold text-slate-800">{tag.post_count || 0}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-400">笔记</div>
                    <div className="mt-1 font-semibold text-slate-800">{tag.note_count || 0}</div>
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </Surface>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-950">{editingTag ? "编辑标签" : "新建标签"}</DialogTitle>
            <DialogDescription className="text-slate-500">
              选择一个清晰的名称和颜色。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="标签名称" autoFocus required />
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">颜色</div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <motion.button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    whileHover={{ y: -2, scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className={`h-8 w-8 rounded-lg border-2 transition ${color === preset ? "scale-110 border-slate-950 shadow-md" : "border-transparent"}`}
                    style={{ backgroundColor: preset }}
                    aria-label={preset}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="gap-3 pt-1 sm:space-x-0">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>取消</SecondaryButton>
              <PrimaryButton type="submit">{editingTag ? "保存" : "创建"}</PrimaryButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">删除标签</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">删除后，该标签会从关联内容中移除。</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
              <span className="h-8 w-8 rounded-lg ring-1 ring-black/5" style={{ backgroundColor: deleteTarget.color }} />
              <span className="text-sm font-medium text-slate-800">{deleteTarget.name}</span>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setDeleteTarget(null)}>取消</SecondaryButton>
              <PrimaryButton type="button" tone="danger" onClick={() => handleDelete(deleteTarget)}>
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
