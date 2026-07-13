import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, CalendarDays, GraduationCap, Layers3, Plus, Search, Star, UserRound } from "lucide-react";
import { useCourses, useCreateCourse, usePrefetchCourse } from "../hooks/api";
import { preloadPage } from "../pageLoaders";
import { CardGridSkeleton } from "../components/skeleton/Skeletons";
import Folder from "../components/Folder";
import SpotlightCard from "../components/SpotlightCard";
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
  ErrorState,
  IconBadge,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
  TextAreaField,
  TextField,
} from "../components/PageScaffold";

const FAVORITE_COURSES_KEY = "course:favorites";

function readFavoriteCourseIds() {
  try {
    const raw = window.localStorage.getItem(FAVORITE_COURSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

export default function Courses() {
  const { data: items, isLoading, error } = useCourses();
  const createMut = useCreateCourse();
  const prefetchCourse = usePrefetchCourse();
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [teacher, setTeacher] = useState("");
  const [semester, setSemester] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [favoriteCourseIds, setFavoriteCourseIds] = useState<number[]>(readFavoriteCourseIds);

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
  const showcaseCourses = useMemo(() => filteredCourses.slice(0, 5), [filteredCourses]);
  const favoriteCourses = useMemo(
    () => favoriteCourseIds
      .map((id) => courses.find((course) => course.id === id))
      .filter(Boolean)
      .slice(0, 3),
    [courses, favoriteCourseIds]
  );
  const teacherCount = courses.filter((course) => course.teacher?.trim()).length;
  const introCount = courses.filter((course) => course.intro?.trim()).length;
  const introRate = courses.length ? Math.round((introCount / courses.length) * 100) : 0;

  function toggleFavoriteCourse(courseId: number) {
    setFavoriteCourseIds((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [courseId, ...prev].slice(0, 12);
      window.localStorage.setItem(FAVORITE_COURSES_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await createMut.mutateAsync({ name, intro, teacher, semester });
    setName("");
    setIntro("");
    setTeacher("");
    setSemester("");
    setCreateOpen(false);
  }

  return (
    <PageShell
      title="课程"
      description="集中管理课程、资料入口和课程讨论，让学习内容按课程归档。"
      actions={
        <>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {courses.length} 门课程</div>
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            添加课程
          </PrimaryButton>
        </>
      }
    >
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-950">添加课程</DialogTitle>
            <DialogDescription className="text-slate-500">
              创建后可以上传资料并发起课程对话。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <TextField placeholder="课程名称" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField placeholder="授课教师" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
              <TextField placeholder="学期" value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
            <TextAreaField rows={4} placeholder="课程简介" value={intro} onChange={(e) => setIntro(e.target.value)} />
            <DialogFooter className="gap-3 pt-1 sm:space-x-0">
              <SecondaryButton type="button" onClick={() => setCreateOpen(false)}>取消</SecondaryButton>
              <PrimaryButton type="submit" disabled={createMut.isPending}>
                <Plus size={16} />
                {createMut.isPending ? "添加中..." : "添加课程"}
              </PrimaryButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!isLoading && courses.length > 0 && (
        <CourseShowcase
          courses={showcaseCourses}
          favoriteCourses={favoriteCourses}
          filteredCount={filteredCourses.length}
          total={courses.length}
          semesterCount={semesters.length}
          introRate={introRate}
          teacherCount={teacherCount}
          onPrefetch={(courseId) => {
            preloadPage("courseDetail");
            prefetchCourse(courseId);
          }}
        />
      )}

      <div className="space-y-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : isLoading ? (
            <CardGridSkeleton cards={6} />
          ) : !items || items.length === 0 ? (
            <EmptyState
              title="暂无课程"
              description="先创建一门课程，再上传资料和开启课程对话。"
              icon={BookOpen}
              action={<PrimaryButton onClick={() => setCreateOpen(true)}>创建第一门课程</PrimaryButton>}
            />
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
                    <CourseCard
                      key={course.id}
                      course={course}
                      index={index}
                      favorite={favoriteCourseIds.includes(course.id)}
                      onToggleFavorite={() => toggleFavoriteCourse(course.id)}
                      onPrefetch={() => {
                        preloadPage("courseDetail");
                        prefetchCourse(course.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
      </div>
    </PageShell>
  );
}

function CourseShowcase({
  courses,
  favoriteCourses,
  filteredCount,
  total,
  semesterCount,
  introRate,
  teacherCount,
  onPrefetch,
}: {
  courses: any[];
  favoriteCourses: any[];
  filteredCount: number;
  total: number;
  semesterCount: number;
  introRate: number;
  teacherCount: number;
  onPrefetch: (courseId: number) => void;
}) {
  const folderItems = favoriteCourses.length
    ? favoriteCourses.map((course) => (
        <FavoriteCoursePaper
          key={course.id}
          course={course}
          onPrefetch={() => onPrefetch(course.id)}
        />
      ))
    : [<FavoriteCourseEmptyPaper key="empty" />];

  if (courses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <SpotlightCard
        radius={360}
        className="overflow-hidden rounded-3xl border border-white/80 bg-white/82 p-5 shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur lg:p-6"
        color="rgba(15,23,42,0.08)"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(15,23,42,0.06),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(248,250,252,0.42)_55%,rgba(226,232,240,0.36))]" />
        <div className="relative min-w-0 text-slate-950">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
              <Layers3 size={14} />
              当前筛选摘要
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight">先进入最相关的课程，再处理资料和讨论。</h2>
          </div>
          <div className="mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <CourseHeroStat label="课程数量" value={total} hint={`当前筛选 ${filteredCount}`} />
            <CourseHeroStat label="学期分布" value={semesterCount || "未设置"} hint="用于筛选课程阶段" />
            <CourseHeroStat label="简介完整度" value={`${introRate}%`} hint={`${teacherCount} 门已设置教师`} />
          </div>
        </div>
      </SpotlightCard>

      <FavoriteCourseDock favoriteCourses={favoriteCourses} folderItems={folderItems} />
    </div>
  );
}

function CourseHeroStat({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/68 px-4 py-3 shadow-sm backdrop-blur">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function FavoriteCourseDock({
  favoriteCourses,
  folderItems,
}: {
  favoriteCourses: any[];
  folderItems: ReactNode[];
}) {
  return (
    <div className="relative flex min-h-64 flex-col items-center justify-center overflow-visible rounded-3xl bg-transparent px-3 py-4 text-center">
      <div className="relative flex h-44 w-full items-center justify-center overflow-visible">
        <div className="pointer-events-none absolute bottom-4 h-16 w-56 rounded-full bg-slate-900/10 blur-2xl" />
        <Folder
          color="#64748b"
          size={1.55}
          items={folderItems}
          className="course-favorite-folder origin-center"
        />
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
        <Star size={13} className={favoriteCourses.length ? "fill-slate-950 text-slate-950" : "text-slate-400"} />
        收藏 {favoriteCourses.length}/3
      </div>
    </div>
  );
}

function FavoriteCoursePaper({ course, onPrefetch }: { course: any; onPrefetch: () => void }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onClick={(event) => event.stopPropagation()}
      className="group flex h-full w-full flex-col justify-between rounded-[10px] bg-white p-2 text-left text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
    >
      <span className="flex items-center justify-between gap-2">
        <BookOpen size={13} className="shrink-0 text-slate-950" />
        <GraduationCap size={11} className="shrink-0 text-slate-300 transition group-hover:text-slate-950" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold leading-tight">{course.name || "未命名课程"}</span>
        <span className="mt-0.5 block truncate text-[9px] leading-tight text-slate-500">
          {course.teacher || "未设置教师"} · {course.semester || "未设置学期"}
        </span>
      </span>
    </Link>
  );
}

function FavoriteCourseEmptyPaper() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[10px] bg-white p-2 text-center text-[9px] font-semibold leading-tight text-slate-400 ring-1 ring-slate-200">
      <Star size={13} />
      <span className="mt-1">收藏后显示</span>
    </div>
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

function CourseCard({
  course,
  index,
  favorite,
  onToggleFavorite,
  onPrefetch,
}: {
  course: any;
  index: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onPrefetch: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.985 }}
    >
      <SpotlightCard className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[var(--shadow-lift)]">
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px scale-x-0 bg-slate-900/40 transition duration-300 group-hover:scale-x-100" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <IconBadge icon={BookOpen} tone="slate" />
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">{course.semester || "未设置学期"}</span>
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                favorite
                  ? "border-amber-200 bg-amber-50 text-amber-500 shadow-sm"
                  : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500"
              }`}
              title={favorite ? "取消收藏" : "收藏课程"}
              aria-label={favorite ? "取消收藏课程" : "收藏课程"}
            >
              <Star size={15} className={favorite ? "fill-current" : ""} />
            </button>
          </div>
        </div>
        <Link
          to={`/courses/${course.id}`}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          className="block"
        >
          <h3 className="truncate text-base font-semibold text-slate-950">{course.name}</h3>
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
      </SpotlightCard>
    </motion.div>
  );
}
