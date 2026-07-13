import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, Eye, Heart, MessageCircle, PenLine, Plus } from "lucide-react";
import { resolveAssetUrl } from "../../api/client";
import { usePosts, usePrefetchPost } from "../../hooks/api";
import { ListSkeleton } from "../../components/skeleton/Skeletons";
import AnimatedList from "../../components/AnimatedList";
import { cn } from "../../lib/utils";
import { ProgressiveBlur } from "../../components/ui/progressive-blur";
import { GooeyInput } from "../../components/ui/gooey-input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { EmptyState, PageShell, SecondaryButton } from "../../components/PageScaffold";
import { preloadPage } from "../../pageLoaders";
import { formatBeijingDateTime } from "../../utils/time";

const PAGE_SIZE = 8;

function getInitial(name?: string) {
  return (name || "学").trim().slice(0, 1).toUpperCase();
}

function stripHtml(value?: string) {
  return (value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function ForumTweetCard({
  post,
  onPrefetch,
  selected,
}: {
  post: any;
  onPrefetch: () => void;
  selected?: boolean;
}) {
  const author = post.author_nickname || post.author_name || "学习者";
  const username = post.author_username || post.username || "unknown";
  const avatarUrl = resolveAssetUrl(post.author_avatar_url || post.avatar_url);
  const content = stripHtml(post.content);

  return (
    <Link
      to={`/forum/${post.id}`}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm transition-all duration-200",
        "hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70",
        selected && "border-slate-300 shadow-xl shadow-slate-200/70"
      )}
    >
      <span className="pointer-events-none absolute inset-x-5 top-0 h-px scale-x-0 bg-slate-950/40 transition duration-300 group-hover:scale-x-100" />
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
              @{username} · {formatBeijingDateTime(post.created_at)}
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
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [inputVal, setInputVal] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const prefetchPost = usePrefetchPost();

  const { data: posts = [], isLoading: loading } = usePosts({
    sort,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
  });
  const hasNextPage = posts.length === PAGE_SIZE;

  function setSort(s: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", s);
      next.delete("page");
      return next;
    });
  }

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const query = next.toString();
    return query ? `?${query}` : "/forum";
  }

  function goToPage(nextPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextPage <= 1) next.delete("page");
      else next.set("page", String(nextPage));
      return next;
    });
  }

  const handleSearchInput = useCallback((val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val) next.set("search", val);
        else next.delete("search");
        next.delete("page");
        return next;
      });
    }, 300);
  }, [setSearchParams]);

  return (
    <PageShell
      title="讨论区"
      description="整理课程问题、经验复盘和 AI 对话沉淀。"
      actions={
        <Link
          to="/forum/new"
          onMouseEnter={() => preloadPage("postEditor")}
          onFocus={() => preloadPage("postEditor")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0"
        >
          <Plus size={16} />
          发布帖子
        </Link>
      }
    >
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <div className="rounded-lg border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[auto_minmax(260px,1fr)]">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setSort("latest")} className={`rounded-lg px-3 py-1.5 text-sm transition ${sort === "latest" ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>最新</button>
              <button onClick={() => setSort("hot")} className={`rounded-lg px-3 py-1.5 text-sm transition ${sort === "hot" ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>热门</button>
              <button onClick={() => setSort("essence")} className={`rounded-lg px-3 py-1.5 text-sm transition ${sort === "essence" ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>精华</button>
            </div>
            <div className="justify-self-start md:justify-self-end">
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
        </div>

        {loading ? (
          <ListSkeleton rows={5} />
        ) : posts.length === 0 ? (
          <EmptyState
            title={page > 1 ? "本页没有更多帖子" : "暂无帖子"}
            description={page > 1 ? "已经到达列表末尾，可以返回上一页继续浏览。" : "可以先发布第一条课程问题或复盘。"}
            icon={MessageCircle}
            action={
              page > 1 ? (
                <SecondaryButton type="button" onClick={() => goToPage(page - 1)}>
                  返回上一页
                </SecondaryButton>
              ) : undefined
            }
          />
        ) : (
          <AnimatedList
            items={posts}
            getItemKey={(post: any) => post.id}
            enableArrowNavigation={false}
            showGradients
            className="forum-animated-list"
            renderItem={(post: any, _index, selected) => (
              <ForumTweetCard
                post={post}
                selected={selected}
                onPrefetch={() => {
                  preloadPage("postDetail");
                  prefetchPost(post.id);
                }}
              />
            )}
          />
        )}

        {!loading && posts.length > 0 && (page > 1 || hasNextPage) && (
          <Pagination className="pt-1">
            <PaginationContent className="rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur">
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    href={pageHref(page - 1)}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page - 1);
                    }}
                    className="rounded-xl text-slate-600 hover:bg-slate-100"
                  />
                </PaginationItem>
              )}
              {page > 1 && (
                <PaginationItem>
                  <PaginationLink
                    href={pageHref(page - 1)}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page - 1);
                    }}
                    className="rounded-xl"
                  >
                    {page - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href={pageHref(page)}
                  isActive
                  className="rounded-xl border-slate-900 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
              {hasNextPage && (
                <PaginationItem>
                  <PaginationLink
                    href={pageHref(page + 1)}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page + 1);
                    }}
                    className="rounded-xl"
                  >
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              {hasNextPage && (
                <PaginationItem>
                  <PaginationNext
                    href={pageHref(page + 1)}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page + 1);
                    }}
                    className="rounded-xl text-slate-600 hover:bg-slate-100"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </PageShell>
  );
}
