import { useEffect, useState } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { GooeyInput } from "../components/ui/gooey-input";

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

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const { data: rawTags, isLoading: loading } = useTags(debounced || undefined);
  const tags = Array.isArray(rawTags) ? rawTags : [];

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
    toast.start(editingTag ? "更新中…" : "创建中…");
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
    if (!confirm(`确认删除标签「${tag.name}」？`)) return;
    toast.start("删除中…");
    try {
      await deleteMut.mutateAsync(tag.id);
      toast.success("已删除标签");
    } catch (err: any) {
      toast.error(err.message || "删除失败");
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">标签管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理所有标签，共 {tags.length} 个标签</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建标签
        </button>
      </div>

      <div className="mb-4">
        <GooeyInput
          placeholder="搜索标签..."
          collapsedLabel="搜索"
          value={search}
          onValueChange={setSearch}
          collapsedWidth={118}
          expandedWidth={240}
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
        <div className="text-slate-400 py-8 text-center">加载中...</div>
      ) : tags.length === 0 ? (
        <div className="text-slate-400 py-8 text-center">暂无标签</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((tag: any) => (
            <div key={tag.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">{tag.name}</div>
                  <div className="text-xs text-slate-400">
                    帖子 {tag.post_count || 0} · 笔记 {tag.note_count || 0}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(tag)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                  title="编辑">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => handleDelete(tag)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                  title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-5">
              {editingTag ? "编辑标签" : "新建标签"}
            </h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">取消</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  {editingTag ? "保存" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
