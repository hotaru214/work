import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Download,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  MessageCircle,
  PenLine,
  PlayCircle,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, getToken } from "../api/client";
import { useCourse, useDeleteMaterial, useMaterials, usePosts, usePrefetchPost } from "../hooks/api";
import { GooeyInput } from "../components/ui/gooey-input";
import { useMutationToast } from "../components/ui/toast";
import {
  EmptyState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
} from "../components/PageScaffold";
import { preloadPage } from "../pageLoaders";

function getFileType(filename: string): "image" | "pdf" | "video" | "audio" | "text" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["mp4", "webm", "avi", "mov", "mkv", "wmv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac", "wma"].includes(ext)) return "audio";
  if (["txt", "md", "csv", "json", "xml", "yaml", "yml", "log", "py", "js", "ts", "tsx", "jsx", "html", "css", "sql", "sh", "bat"].includes(ext)) return "text";
  return "other";
}

type FileType = ReturnType<typeof getFileType>;

export default function CourseDetail() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const prefetchPost = usePrefetchPost();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: materials = [] } = useMaterials(courseId);
  const { data: forumPosts = [] } = usePosts({ course_id: courseId, page_size: 5 });
  const deleteMaterialMut = useDeleteMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; filename: string; type: ReturnType<typeof getFileType> } | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [deletingMaterial, setDeletingMaterial] = useState<any | null>(null);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState<FileType | "all">("all");
  const [startingChat, setStartingChat] = useState(false);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    toast.start("上传中...");
    try {
      await api.uploadMaterial(courseId, file, file.name.split(".").pop() || "other");
      if (fileRef.current) fileRef.current.value = "";
      setSelectedFileName("");
      queryClient.invalidateQueries({ queryKey: ["materials", courseId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("资料已上传");
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    }
  }

  async function startChat() {
    if (startingChat) return;
    setStartingChat(true);
    try {
      const session = await api.createSession(courseId, course?.name || "课程对话");
      navigate(`/chat/${session.id}`);
    } finally {
      setStartingChat(false);
    }
  }

  async function handlePreview(material: any) {
    setPreviewLoading(true);
    setPreviewText("");
    try {
      const token = getToken();
      const res = await fetch(`/api/materials/${material.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("加载失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const type = getFileType(material.filename);
      if (type === "text") {
        setPreviewText(await blob.text());
      }
      setPreview({ url, filename: material.filename, type });
    } catch {
      toast.error("加载失败");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPreviewText("");
  }

  async function confirmDeleteMaterial() {
    if (!deletingMaterial) return;
    toast.start("删除中...");
    try {
      await deleteMaterialMut.mutateAsync(deletingMaterial.id);
      toast.success("已删除");
      setDeletingMaterial(null);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
  }

  if (courseLoading || !course) {
    return (
      <PageShell title="课程详情" description="加载课程资料中...">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Surface key={index} className="h-32 animate-pulse bg-white" />
          ))}
        </div>
      </PageShell>
    );
  }

  const typeCounts = materials.reduce<Record<string, number>>((acc, item: any) => {
    const type = getFileType(item.filename);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const filteredMaterials = useMemo(() => {
    const keyword = materialSearch.trim().toLowerCase();
    return materials.filter((material: any) => {
      const type = getFileType(material.filename);
      if (materialTypeFilter !== "all" && type !== materialTypeFilter) return false;
      if (!keyword) return true;
      return [material.filename, type, fileTypeLabel(type)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [materials, materialSearch, materialTypeFilter]);

  return (
    <PageShell
      title={course.name}
      eyebrow="课程详情"
      description={course.intro || "暂无简介，可以先上传资料或开始课程对话。"}
      actions={
        <>
          <SecondaryButton
            onMouseEnter={() => preloadPage("forumList")}
            onFocus={() => preloadPage("forumList")}
            onClick={() => navigate(`/forum?course_id=${courseId}`)}
          >
            <MessageCircle size={16} />
            课程讨论区
          </SecondaryButton>
          <PrimaryButton
            onMouseEnter={() => preloadPage("chat")}
            onFocus={() => preloadPage("chat")}
            onClick={startChat}
            disabled={startingChat}
          >
            <PenLine size={16} />
            {startingChat ? "创建中…" : "开始课程对话"}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="学习资料" value={materials.length} hint="已上传文件" icon={FileText} tone="blue" />
        <MetricCard label="相关讨论" value={forumPosts.length} hint="课程关联帖子" icon={MessageCircle} tone="violet" />
        <MetricCard label="授课信息" value={course.teacher || "未设置"} hint={course.semester || "未设置学期"} icon={BookOpen} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <div className="space-y-6">
          <Surface>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">学习资料</h2>
                <p className="mt-1 text-xs text-slate-500">上传课件、笔记和参考文件，支持常见格式在线预览。</p>
              </div>
              <form onSubmit={onUpload} className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                <label className="group flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:text-slate-900">
                  <Upload size={15} className="transition group-hover:-translate-y-0.5" />
                  <span className="max-w-[180px] truncate">{selectedFileName || "选择资料文件"}</span>
                  <input
                    ref={fileRef}
                    type="file"
                    className="sr-only"
                    onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || "")}
                  />
                </label>
                <PrimaryButton type="submit">
                  <Upload size={16} />
                  上传
                </PrimaryButton>
              </form>
            </div>

            {materials.length === 0 ? (
              <div className="p-5">
                <EmptyState title="暂无资料" description="上传课件、讲义或笔记后会在这里统一管理。" icon={FileArchive} />
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-xs text-slate-500">
                    当前显示 {filteredMaterials.length} / {materials.length} 个文件
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:pb-0">
                      <MaterialFilterChip active={materialTypeFilter === "all"} onClick={() => setMaterialTypeFilter("all")}>全部</MaterialFilterChip>
                      {(["text", "image", "video", "audio", "pdf", "other"] as Array<FileType>).map((type) => (
                        <MaterialFilterChip key={type} active={materialTypeFilter === type} onClick={() => setMaterialTypeFilter(type)}>
                          {fileTypeLabel(type)}
                        </MaterialFilterChip>
                      ))}
                    </div>
                    <GooeyInput
                      placeholder="搜索资料文件..."
                      collapsedLabel="搜索"
                      value={materialSearch}
                      onValueChange={setMaterialSearch}
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
                </div>

                {filteredMaterials.length === 0 ? (
                  <div className="p-5">
                    <EmptyState title="没有匹配资料" description="换个关键词或切换类型筛选后再试。" icon={Search} />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <AnimatePresence initial={false}>
                      {filteredMaterials.map((material: any, index: number) => (
                        <MaterialRow
                          key={material.id}
                          material={material}
                          index={index}
                          onPreview={handlePreview}
                          onDelete={() => setDeletingMaterial(material)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-slate-950">资料类型</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "文档", type: "text" as FileType, value: typeCounts.text || 0, icon: FileText },
                { label: "图片", type: "image" as FileType, value: typeCounts.image || 0, icon: FileImage },
                { label: "视频", type: "video" as FileType, value: typeCounts.video || 0, icon: PlayCircle },
                { label: "其他", type: "other" as FileType, value: typeCounts.other || 0, icon: FileArchive },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMaterialTypeFilter((current) => current === item.type ? "all" : item.type)}
                  className={`rounded-lg p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                    materialTypeFilter === item.type ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950 hover:bg-white"
                  }`}
                >
                  <IconBadge icon={item.icon} tone="slate" />
                  <div className={`mt-3 text-xs ${materialTypeFilter === item.type ? "text-white/55" : "text-slate-400"}`}>{item.label}</div>
                  <div className={`mt-1 text-lg font-semibold ${materialTypeFilter === item.type ? "text-white" : "text-slate-950"}`}>{item.value}</div>
                </button>
              ))}
            </div>
          </Surface>

          <Surface>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">相关讨论</h2>
              <p className="mt-1 text-xs text-slate-500">课程相关帖子可以从这里快速进入。</p>
            </div>
            {forumPosts.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="暂无讨论"
                  description="把课程问题发到讨论区，方便之后复盘。"
                  icon={MessageCircle}
                  action={
                    <PrimaryButton
                      onMouseEnter={() => preloadPage("postEditor")}
                      onFocus={() => preloadPage("postEditor")}
                      onClick={() => navigate(`/forum/new?course_id=${courseId}`)}
                    >
                      发布帖子
                    </PrimaryButton>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {forumPosts.map((post: any) => (
                  <motion.div key={post.id} whileHover={{ x: 3 }} transition={{ duration: 0.16 }}>
                    <Link
                      to={`/forum/${post.id}`}
                      className="block px-5 py-3 transition hover:bg-slate-50"
                      onMouseEnter={() => {
                        preloadPage("postDetail");
                        prefetchPost(post.id);
                      }}
                      onFocus={() => {
                        preloadPage("postDetail");
                        prefetchPost(post.id);
                      }}
                    >
                      <div className="line-clamp-2 text-sm font-medium text-slate-900">{post.title}</div>
                      <div className="mt-1 text-xs text-slate-400">喜欢 {post.like_count} · 评论 {post.comment_count}</div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Surface>
        </div>
      </div>

      <AnimatePresence>
        {preview && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closePreview}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{preview.filename}</div>
                <div className="mt-0.5 text-xs text-slate-400">{preview.type}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={preview.url} download={preview.filename} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
                  <Download size={15} />
                  下载
                </a>
                <button onClick={closePreview} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
              {previewLoading ? (
                <div className="py-16 text-center text-sm text-slate-400">加载中...</div>
              ) : preview.type === "image" ? (
                <img src={preview.url} alt={preview.filename} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm" />
              ) : preview.type === "pdf" ? (
                <iframe src={preview.url} className="h-[75vh] w-full rounded-lg border-0 bg-white" title={preview.filename} />
              ) : preview.type === "video" ? (
                <video controls className="mx-auto max-h-[70vh] max-w-full rounded-lg shadow-sm">
                  <source src={preview.url} />
                </video>
              ) : preview.type === "audio" ? (
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
                  <IconBadge icon={FileAudio} tone="violet" />
                  <audio controls className="w-full">
                    <source src={preview.url} />
                  </audio>
                </div>
              ) : preview.type === "text" ? (
                <pre className="mx-auto max-w-4xl whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800">{previewText}</pre>
              ) : (
                <EmptyState
                  title="该格式暂不支持在线预览"
                  description="可以先下载到本地查看。"
                  icon={FileArchive}
                  action={<a href={preview.url} download={preview.filename} className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white">下载文件</a>}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingMaterial && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setDeletingMaterial(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">删除学习资料</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">确认删除这个文件？删除后需要重新上传才能恢复。</p>
                  </div>
                  <button onClick={() => setDeletingMaterial(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                  <IconBadge icon={iconForType(getFileType(deletingMaterial.filename))} tone="rose" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{deletingMaterial.filename}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{fileTypeLabel(getFileType(deletingMaterial.filename))}</div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <SecondaryButton type="button" onClick={() => setDeletingMaterial(null)}>取消</SecondaryButton>
                  <PrimaryButton
                    type="button"
                    className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300"
                    disabled={deleteMaterialMut.isPending}
                    onClick={confirmDeleteMaterial}
                  >
                    <Trash2 size={16} />
                    {deleteMaterialMut.isPending ? "删除中..." : "删除"}
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function MaterialRow({
  material,
  index,
  onPreview,
  onDelete,
}: {
  material: any;
  index: number;
  onPreview: (material: any) => void;
  onDelete: () => void;
}) {
  const type = getFileType(material.filename);
  const Icon = iconForType(type);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.14) }}
      whileHover={{ backgroundColor: "#f8fafc" }}
      className="flex items-center gap-3 px-5 py-3"
    >
      <IconBadge icon={Icon} tone="slate" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">{material.filename}</div>
        <div className="mt-0.5 text-xs text-slate-400">{fileTypeLabel(type)} · {new Date(material.uploaded_at).toLocaleString("zh-CN")}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SecondaryButton className="h-9 px-3" onClick={() => onPreview(material)}>预览</SecondaryButton>
        <SecondaryButton className="h-9 px-3 text-rose-600 hover:border-rose-200 hover:bg-rose-50" onClick={onDelete}>
          <Trash2 size={15} />
        </SecondaryButton>
      </div>
    </motion.div>
  );
}

function iconForType(type: FileType) {
  if (type === "image") return FileImage;
  if (type === "video") return PlayCircle;
  if (type === "audio") return FileAudio;
  if (type === "text") return FileCode2;
  return FileArchive;
}

function fileTypeLabel(type: FileType) {
  const labels = {
    image: "图片",
    pdf: "PDF",
    video: "视频",
    audio: "音频",
    text: "文本",
    other: "其他",
  };
  return labels[type];
}

function MaterialFilterChip({
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
