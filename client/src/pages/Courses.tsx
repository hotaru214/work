import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourses, useCreateCourse, usePrefetchCourse } from "../hooks/api";
import { CardGridSkeleton } from "../components/skeleton/Skeletons";

export default function Courses() {
  const { data: items, isLoading, error } = useCourses();
  const createMut = useCreateCourse();
  const prefetchCourse = usePrefetchCourse();
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [teacher, setTeacher] = useState("");
  const [semester, setSemester] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createMut.mutateAsync({ name, intro, teacher, semester });
    setName(""); setIntro(""); setTeacher(""); setSemester("");
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">我的课程</h1>
      <form onSubmit={onCreate} className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 gap-3">
        <input className="border px-3 py-2 rounded" placeholder="课程名称" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="border px-3 py-2 rounded" placeholder="授课教师" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
        <input className="border px-3 py-2 rounded" placeholder="学期" value={semester} onChange={(e) => setSemester(e.target.value)} />
        <input className="border px-3 py-2 rounded col-span-2" placeholder="课程简介" value={intro} onChange={(e) => setIntro(e.target.value)} />
        <button disabled={createMut.isPending} className="col-span-2 bg-slate-900 text-white py-2 rounded hover:bg-slate-800 disabled:opacity-60">
          {createMut.isPending ? "添加中…" : "添加课程"}
        </button>
      </form>

      {error ? (
        <div className="text-red-600">加载课程失败：{(error as Error).message}</div>
      ) : isLoading ? (
        <CardGridSkeleton cards={4} />
      ) : !items || items.length === 0 ? (
        <div className="text-slate-500">暂无课程</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((c) => (
            <Link
              to={`/courses/${c.id}`}
              key={c.id}
              className="bg-white p-4 rounded shadow hover:shadow-md transition"
              onMouseEnter={() => prefetchCourse(c.id)}
              onFocus={() => prefetchCourse(c.id)}
            >
              <div className="font-medium text-lg">{c.name}</div>
              <div className="text-sm text-slate-600 mt-1">{c.teacher} · {c.semester}</div>
              <div className="text-sm text-slate-500 mt-2 line-clamp-2">{c.intro || "无简介"}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
