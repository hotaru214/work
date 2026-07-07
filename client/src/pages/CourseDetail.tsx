import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useCourse, useMaterials, usePosts, useDeleteMaterial, usePrefetchPost } from "../hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import { useMutationToast } from "../components/ui/toast";

function getFileType(filename: string): "image" | "pdf" | "video" | "audio" | "text" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["mp4", "webm", "avi", "mov", "mkv", "wmv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac", "wma"].includes(ext)) return "audio";
  if (["txt", "md", "csv", "json", "xml", "yaml", "yml", "log", "py", "js", "ts", "tsx", "jsx", "html", "css", "sql", "sh", "bat"].includes(ext)) return "text";
  return "other";
}

export default function CourseDetail() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const prefetchPost = usePrefetchPost();
  const { data: course } = useCourse(courseId);
  const { data: materials = [] } = useMaterials(courseId);
  const { data: forumPosts = [] } = usePosts({ course_id: courseId, page_size: 5 });
  const deleteMaterialMut = useDeleteMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; filename: string; type: ReturnType<typeof getFileType> } | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    toast.start("上传中…");
    try {
      await api.uploadMaterial(courseId, file, file.name.split(".").pop() || "other");
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["materials", courseId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("资料已上传");
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    }
  }

  async function startChat() {
    const session = await api.createSession(courseId, course?.name || "课程对话");
    navigate(`/chat/${session.id}`);
  }

  async function handlePreview(m: any) {
    setPreviewLoading(true);
    setPreviewText("");
    try {
      const token = getToken();
      const res = await fetch(`/api/materials/${m.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("加载失败"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const type = getFileType(m.filename);
      if (type === "text") {
        const text = await blob.text();
        setPreviewText(text);
      }
      setPreview({ url, filename: m.filename, type });
    } catch { alert("加载失败"); }
    finally { setPreviewLoading(false); }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPreviewText("");
  }

  if (!course) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">{course.name}</h1>
      <div className="text-sm text-slate-600 mt-1">{course.teacher} · {course.semester}</div>
      <div className="text-slate-700 mt-3">{course.intro || "无简介"}</div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button onClick={startChat} className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">
          开始课程对话
        </button>
        <Link to={`/forum?course_id=${courseId}`} className="bg-white border px-4 py-2 rounded hover:bg-slate-50 text-sm">
          📙 课程讨论区
        </Link>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">学习资料</h2>
      <form onSubmit={onUpload} className="bg-white p-4 rounded shadow mb-4 flex gap-3 items-center flex-wrap">
        <input type="file" ref={fileRef} className="text-sm" />
        <button className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">上传</button>
      </form>

      {materials.length === 0 ? (
        <div className="text-slate-500">暂无资料</div>
      ) : (
        <ul className="divide-y bg-white rounded shadow">
          {materials.map((m: any) => (
            <li key={m.id} className="px-4 py-3 flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.filename}</div>
                <div className="text-xs text-slate-500">{getFileType(m.filename)} · {new Date(m.uploaded_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-3 shrink-0 ml-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => handlePreview(m)}
                >
                  预览
                </button>
                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={async () => {
                    toast.start("删除中…");
                    try {
                      await deleteMaterialMut.mutateAsync(m.id);
                      toast.success("已删除");
                    } catch (e: any) {
                      toast.error(e.message || "删除失败");
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {forumPosts.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8 mb-3">相关讨论</h2>
          <div className="space-y-2">
            {forumPosts.map((p: any) => (
              <Link
                key={p.id}
                to={`/forum/${p.id}`}
                className="block bg-white p-3 rounded shadow text-sm hover:shadow-md"
                onMouseEnter={() => prefetchPost(p.id)}
                onFocus={() => prefetchPost(p.id)}
              >
                <span className="font-medium">{p.title}</span>
                <span className="text-slate-400 ml-2">❤️ {p.like_count} 💬 {p.comment_count}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closePreview}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate">{preview.filename}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">{preview.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  download={preview.filename}
                  className="text-xs text-blue-600 hover:underline"
                >
                  下载
                </a>
                <button onClick={closePreview} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-50/50">
              {previewLoading ? (
                <div className="text-slate-400 py-12">加载中...</div>
              ) : preview.type === "image" ? (
                <img src={preview.url} alt={preview.filename} className="max-w-full max-h-[70vh] object-contain rounded shadow-sm" />
              ) : preview.type === "pdf" ? (
                <iframe src={preview.url} className="w-full h-[75vh] border-0 rounded" title={preview.filename} />
              ) : preview.type === "video" ? (
                <video controls className="max-w-full max-h-[70vh] rounded shadow-sm">
                  <source src={preview.url} />
                </video>
              ) : preview.type === "audio" ? (
                <div className="w-full max-w-md py-8 flex flex-col items-center gap-4">
                  <div className="text-6xl">🎵</div>
                  <audio controls className="w-full">
                    <source src={preview.url} />
                  </audio>
                </div>
              ) : preview.type === "text" ? (
                <pre className="w-full max-w-3xl text-sm leading-relaxed font-mono bg-white p-4 rounded border whitespace-pre-wrap">{previewText}</pre>
              ) : (
                <div className="flex flex-col items-center gap-4 py-12 text-slate-500">
                  <div className="text-5xl">📄</div>
                  <div>该格式暂不支持在线预览</div>
                  <a href={preview.url} download={preview.filename}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    下载文件
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
