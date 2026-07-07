import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, Eye, Heart, MessageCircle, PenLine } from "lucide-react";
import { usePosts, usePrefetchPost } from "../../hooks/api";
import { ListSkeleton } from "../../components/skeleton/Skeletons";
import { cn } from "../../lib/utils";
import { ProgressiveBlur } from "../../components/ui/progressive-blur";
import { GooeyInput } from "../../components/ui/gooey-input";

function getInitial(name?: string) {
  return (name || "学").trim().slice(0, 1).toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(value?: string) {
  return (value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function ForumTweetCard({
  post,
  onPrefetch,
}: {
  post: any;
  onPrefetch: () => void;
}) {
  const author = post.author_nickname || post.author_name || "学习者";
  const username = post.author_username || post.username || "unknown";
  const avatarUrl = post.author_avatar_url || post.avatar_url;
  const content = stripHtml(post.content);

  return (
    <Link
      to={`/forum/${post.id}`}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        "group block rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${author} 的头像`} className="size-full object-cover" />
            ) : (
              getInitial(author)
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-slate-900">{author}</span>
              {post.is_essence && <BadgeCheck className="size-4 shrink-0 text-blue-500" />}
            </div>
            <div className="truncate text-sm text-slate-500">
              @{username} · {formatDate(post.created_at)}
            </div>
          </div>
        </div>
        <PenLine className="mt-1 size-5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-700" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-lg font-semibold leading-snug text-slate-950 group-hover:text-slate-800">
          {post.title}
        </div>
        {content && (
          <div className="relative overflow-hidden">
            <p className="line-clamp-3 text-[15px] leading-7 text-slate-600">
              {content}
            </p>
            {content.length > 90 && (
              <ProgressiveBlur
                height="2.5rem"
                position="bottom"
                blurLevels={[0.5, 1, 2, 4, 8]}
                className="rounded-b-xl"
              />
            )}
          </div>
        )}
      </div>

      {post.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag: any) => (
            <span
              key={tag.id}
              className="rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: `${tag.color}33`,
                backgroundColor: `${tag.color}12`,
                color: tag.color,
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-rose-500">
          <Heart className="size-4" />
          {post.like_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-blue-500">
          <MessageCircle className="size-4" />
          {post.comment_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-slate-700">
          <Eye className="size-4" />
          {post.view_count ?? 0}
        </span>
        {post.is_essence && (
          <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            精华
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ForumList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") || "latest";
  const search = searchParams.get("search") || "";
  const [inputVal, setInputVal] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const prefetchPost = usePrefetchPost();

  const { data: posts = [], isLoading: loading } = usePosts({
    sort,
    search: search || undefined,
    page_size: 50,
  });

  function setSort(s: string) {
    setSearchParams((prev) => {
      prev.set("sort", s);
      return prev;
    });
  }

  const handleSearchInput = useCallback((val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        if (val) prev.set("search", val);
        else prev.delete("search");
        return prev;
      });
    }, 300);
  }, [setSearchParams]);

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">讨论区</h1>
        <Link to="/forum/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
          发布帖子
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-[auto_minmax(340px,1fr)] items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSort("latest")} className={`rounded px-3 py-1 text-sm ${sort === "latest" ? "bg-slate-900 text-white" : "border bg-white"}`}>最新</button>
          <button onClick={() => setSort("hot")} className={`rounded px-3 py-1 text-sm ${sort === "hot" ? "bg-slate-900 text-white" : "border bg-white"}`}>热门</button>
          <button onClick={() => setSort("essence")} className={`rounded px-3 py-1 text-sm ${sort === "essence" ? "bg-slate-900 text-white" : "border bg-white"}`}>精华</button>
        </div>
        <div className="justify-self-end">
          <GooeyInput
            placeholder="搜索标签或标题..."
            collapsedLabel="搜索"
            value={inputVal}
            onValueChange={handleSearchInput}
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
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : posts.length === 0 ? (
        <div className="text-slate-500">暂无帖子，快来发布第一条吧</div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <ForumTweetCard
              key={post.id}
              post={post}
              onPrefetch={() => prefetchPost(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
