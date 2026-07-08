import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, CalendarDays, GraduationCap, Layers3, Plus, Search, UserRound } from "lucide-react";
import { useCourses, useCreateCourse, usePrefetchCourse } from "../hooks/api";
import { preloadPage } from "../pageLoaders";
import { CardGridSkeleton } from "../components/skeleton/Skeletons";
import { GooeyInput } from "../components/ui/gooey-input";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  MetricCard,
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
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");

  const courses = items ?? [];
  const semesters = useMemo(
    () => Array.from(new Set(courses.map((course) => course.semester?.trim()).filter(Boolean))).sort(),
    [courses]
  );
  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSemester = semesterFilter === "all" || course.semester?.trim() === semesterFilter;
      if (!matchesSemester) return false;
      if (!keyword) return true;
      return [course.name, course.intro, course.teacher, course.semester]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [courses, search, semesterFilter]);
  const teacherCount = courses.filter((course) => course.teacher?.trim()).length;
  const introCount = courses.filter((course) => course.intro?.trim()).length;

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
      actions={<div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {courses.length} 门课程</div>}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="课程数量" value={courses.length} hint="当前归档课程" icon={BookOpen} tone="blue" />
        <MetricCard label="学期分布" value={semesters.length || "未设置"} hint="用于筛选课程阶段" icon={Layers3} tone="violet" />
        <MetricCard label="简介完整度" value={`${courses.length ? Math.round((introCount / courses.length) * 100) : 0}%`} hint={`${teacherCount} 门已设置教师`} icon={GraduationCap} tone="emerald" progress={courses.length ? Math.round((introCount / courses.length) * 100) : 0} />
      </div>

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

        <div className="space-y-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : isLoading ? (
            <CardGridSkeleton cards={6} />
          ) : !items || items.length === 0 ? (
            <EmptyState title="暂无课程" description="先创建一门课程，再上传资料和开启课程对话。" icon={BookOpen} />
          ) : (
            <>
              <Surface className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">课程库</div>
                  <div className="mt-1 text-xs text-slate-500">
                    当前显示 {filteredCourses.length} / {courses.length} 门课程
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <FilterChip active={semesterFilter === "all"} onClick={() => setSemesterFilter("all")}>
                      全部
                    </FilterChip>
                    {semesters.map((item) => (
                      <FilterChip key={item} active={semesterFilter === item} onClick={() => setSemesterFilter(item)}>
                        {item}
                      </FilterChip>
                    ))}
                  </div>
                  <GooeyInput
                    placeholder="搜索课程、教师、学期..."
                    collapsedLabel="搜索"
                    value={search}
                    onValueChange={setSearch}
                    collapsedWidth={104}
                    expandedWidth={270}
                    expandedOffset={50}
                    bubbleOffsetY={0}
                    classNames={{
                      root: "justify-start sm:justify-end",
                      trigger: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900 hover:bg-slate-800",
                      bubbleSurface: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900",
                      input: "text-white placeholder:text-white/55",
                    }}
                  />
                </div>
              </Surface>

              {filteredCourses.length === 0 ? (
                <EmptyState title="没有匹配课程" description="换个关键词或清除学期筛选后再试。" icon={Search} />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {filteredCourses.map((course, index) => (
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
                  onMouseEnter={() => {
                    preloadPage("courseDetail");
                    prefetchCourse(course.id);
                  }}
                  onFocus={() => {
                    preloadPage("courseDetail");
                    prefetchCourse(course.id);
                  }}
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
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function FilterChip({
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
