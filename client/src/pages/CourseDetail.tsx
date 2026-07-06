import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function CourseDetail() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [c, ms] = await Promise.all([
      api.getCourse(courseId),
      api.listMaterials(courseId),
    ]);
    setCourse(c);
    setMaterials(ms);
  }

  useEffect(() => { load(); }, [courseId]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    await api.uploadMaterial(courseId, file, file.name.split(".").pop() || "other");
    load();
  }

  async function startChat() {
    const session = await api.createSession(courseId, course?.name || "课程对话");
    navigate(`/chat/${session.id}`);
  }

  if (!course) return <div className="p-6">加载中…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">{course.name}</h1>
      <div className="text-sm text-slate-600 mt-1">{course.teacher} · {course.semester}</div>
      <div className="text-slate-700 mt-3">{course.intro || "无简介"}</div>

      <div className="mt-6 flex gap-3">
        <button onClick={startChat} className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">
          开始课程对话
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">学习资料</h2>
      <form onSubmit={onUpload} className="bg-white p-4 rounded shadow mb-4 flex gap-3 items-center">
        <input type="file" ref={fileRef} className="text-sm" />
        <button className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">上传</button>
      </form>

      {materials.length === 0 ? (
        <div className="text-slate-500">暂无资料</div>
      ) : (
        <ul className="divide-y bg-white rounded shadow">
          {materials.map((m) => (
            <li key={m.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{m.filename}</div>
                <div className="text-xs text-slate-500">{m.type} · {new Date(m.uploaded_at).toLocaleString()}</div>
              </div>
              <button
                className="text-sm text-red-600 hover:underline"
                onClick={async () => { await api.deleteMaterial(m.id); load(); }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}