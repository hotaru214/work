import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, CalendarDays, GraduationCap, Plus, UserRound } from "lucide-react";
import { useCourses, useCreateCourse, usePrefetchCourse } from "../hooks/api";
import { CardGridSkeleton } from "../components/skeleton/Skeletons";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  PageShell,
  PrimaryButton,
  Surface,
  TextAreaField,
  TextField,
} from "../components/PageScaffold";

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
    setName("");
    setIntro("");
    setTeacher("");
    setSemester("");
  }

  return (
    <PageShell
      title="课程"
      description="集中管理课程、资料入口和课程讨论，让学习内容按课程归档。"
      actions={<div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {items?.length ?? 0} 门课程</div>}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <Surface className="h-fit p-5">
          <div className="mb-5 flex items-center gap-3">
            <IconBadge icon={Plus} tone="slate" />
            <div>
              <h2 className="text-sm font-semibold text-slate-950">添加课程</h2>
              <p className="mt-0.5 text-xs text-slate-500">创建后可以上传资料并发起课程对话。</p>
            </div>
          </div>
          <form onSubmit={onCreate} className="space-y-3">
            <TextField placeholder="课程名称" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <TextField placeholder="授课教师" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
              <TextField placeholder="学期" value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
            <TextAreaField rows={4} placeholder="课程简介" value={intro} onChange={(e) => setIntro(e.target.value)} />
            <PrimaryButton type="submit" disabled={createMut.isPending} className="w-full">
              <Plus size={16} />
              {createMut.isPending ? "添加中..." : "添加课程"}
            </PrimaryButton>
          </form>
        </Surface>

        <div>
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : isLoading ? (
            <CardGridSkeleton cards={6} />
          ) : !items || items.length === 0 ? (
            <EmptyState title="暂无课程" description="先创建一门课程，再上传资料和开启课程对话。" icon={BookOpen} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {items.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.985 }}
                >
                <Link
                  to={`/courses/${course.id}`}
                  className="group relative block overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  onMouseEnter={() => prefetchCourse(course.id)}
                  onFocus={() => prefetchCourse(course.id)}
                >
                  <span className="pointer-events-none absolute inset-x-5 top-0 h-px scale-x-0 bg-blue-500/50 transition duration-300 group-hover:scale-x-100" />
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <IconBadge icon={BookOpen} tone="blue" />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600">{course.semester || "未设置学期"}</span>
                  </div>
                  <h3 className="truncate text-base font-semibold text-slate-950 transition group-hover:text-blue-600">{course.name}</h3>
                  <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-slate-500">{course.intro || "暂无课程简介，可以在课程详情中补充资料和讨论。"}</p>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 transition group-hover:bg-white group-hover:shadow-sm">
                      <UserRound size={13} />
                      {course.teacher || "未设置教师"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 transition group-hover:bg-white group-hover:shadow-sm">
                      <CalendarDays size={13} />
                      {course.semester || "未设置"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 transition group-hover:bg-slate-950 group-hover:text-white">
                      <GraduationCap size={13} className="transition group-hover:rotate-6" />
                      进入学习
                    </span>
                  </div>
                </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
