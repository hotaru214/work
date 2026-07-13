import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Eye, Heart, MessageCircle, Sparkles, Trash2, X, type LucideIcon } from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";
import { DetailSkeleton } from "../../components/skeleton/Skeletons";
import { useMutationToast } from "../../components/ui/toast";
import { useComments, usePost, usePrefetchPost, useRelatedPosts } from "../../hooks/api";
import { EmptyState, IconBadge, PageShell, PrimaryButton, SecondaryButton, Surface, TextAreaField } from "../../components/PageScaffold";
import { preloadPage } from "../../pageLoaders";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { formatBeijingDateTime } from "../../utils/time";

function getCurrentUserId() {
  try {
    const tokenPayload = localStorage.getItem("ch_token")?.split(".")[1];
    if (!tokenPayload) return null;
    return JSON.parse(atob(tokenPayload)).sub;
  } catch {
    return null;
  }
}

function getInitial(name?: string) {
  return (name || "学").trim().slice(0, 1).toUpperCase();
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const postId = id ? Number(id) : null;
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const prefetchPost = usePrefetchPost();
  const { data: post, isLoading } = usePost(postId);
  const { data: comments = [] } = useComments(postId);
  const { data: related = [] } = useRelatedPosts(postId);
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleVote() {
    if (!postId) return;
    try {
      await api.votePost(postId);
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e: any) {
      toast.error(e.message || "点赞失败");
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !postId) return;
    try {
      await api.createComment({ post_id: postId, content: commentText.trim() });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("评论已发布");
    } catch (e: any) {
      toast.error(e.message || "评论失败");
    }
  }

  async function handleDelete() {
    if (!postId) return;
    try {
      await api.deletePost(postId);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/forum", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
  }

  if (isLoading || !post) return <DetailSkeleton />;
  const currentUserId = getCurrentUserId();
  const author = post.author_nickname || post.author_name || "学习者";
  const username = post.author_username || post.username || "unknown";
  const avatarUrl = resolveAssetUrl(post.author_avatar_url || post.avatar_url);

  return (
    <PageShell
      title="帖子详情"
      description="查看讨论内容、相关帖子和评论。"
      actions={
        <Link
          to="/forum"
          onMouseEnter={() => preloadPage("forumList")}
          onFocus={() => preloadPage("forumList")}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-x-0.5 hover:border-slate-300 hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          返回讨论区
        </Link>
      }
    >
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Surface className="overflow-hidden p-0">
              <div className="relative overflow-hidden border-b border-slate-100 p-6">
                <span className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-slate-900/5 blur-3xl" />
                <div className="relative">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {post.is_essence && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <BadgeCheck size={13} />
                        精华
                      </span>
                    )}
                    {post.tags?.map((t: any) => (
                      <span key={t.id} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: t.color + "20", color: t.color }}>
                        #{t.name}
                      </span>
                    ))}
                  </div>
                  <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">{post.title}</h1>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <AuthorIdentity author={author} username={username} avatarUrl={avatarUrl} createdAt={post.created_at} />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatPill icon={Eye} value={post.view_count ?? 0} label="浏览" />
                      <StatPill icon={Heart} value={post.like_count ?? 0} label="喜欢" />
                      <StatPill icon={MessageCircle} value={post.comment_count ?? 0} label="评论" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <MarkdownRenderer content={post.content || ""} variant="agent" />
                </div>
              </div>
            </Surface>
          </motion.article>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <IconBadge icon={MessageCircle} tone="blue" />
              <div>
                <h2 className="text-sm font-semibold text-slate-950">评论 ({post.comment_count})</h2>
                <p className="text-xs text-slate-500">补充观点，或者把讨论继续往下推进。</p>
              </div>
            </div>
            <form onSubmit={handleComment} className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <TextAreaField
                rows={3}
                placeholder="写下你的看法..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-white"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{commentText.trim().length ? `${commentText.trim().length} 字` : "保持具体，方便后续复盘"}</span>
                <PrimaryButton disabled={!commentText.trim()}>
                  发布评论
                </PrimaryButton>
              </div>
            </form>

            {comments.length === 0 ? (
              <EmptyState title="暂无评论" description="成为第一个评论的人。" icon={MessageCircle} />
            ) : (
              <div className="space-y-3">
                {comments.map((c: any, index: number) => (
                  <CommentCard key={c.id} comment={c} index={index} />
                ))}
              </div>
            )}
          </Surface>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Surface className="overflow-hidden p-0">
            <div className="relative overflow-hidden border-b border-slate-100 p-5">
              <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-slate-900/8 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <IconBadge icon={Sparkles} tone="violet" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">讨论操作</h2>
                  <p className="mt-0.5 text-xs text-slate-500">把有价值的问题继续沉淀。</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <PrimaryButton onClick={handleVote} className="w-full group">
                <Heart size={16} className="transition group-hover:fill-white" />
                点赞 ({post.like_count})
              </PrimaryButton>
              {post.session_id && (
                <Link
                  to={`/chat/${post.session_id}`}
                  onMouseEnter={() => preloadPage("chat")}
                  onFocus={() => preloadPage("chat")}
                  className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-sm"
                >
                  回到 AI 对话 #{post.session_id}
                  <ArrowUpRight size={14} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              )}
              {String(post.user_id) === String(currentUserId) && (
                <SecondaryButton className="w-full text-rose-600 hover:border-rose-200 hover:bg-rose-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} />
                  删除帖子
                </SecondaryButton>
              )}
            </div>
          </Surface>

          <Surface className="p-4">
            <h2 className="text-sm font-semibold text-slate-950">作者</h2>
            <div className="mt-4">
              <AuthorIdentity author={author} username={username} avatarUrl={avatarUrl} createdAt={post.created_at} />
            </div>
          </Surface>

          {related.length > 0 && (
            <Surface className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-950">相关帖子</h2>
              <div className="space-y-2">
                {related.map((r: any, index: number) => (
                  <RelatedPostCard key={r.id} post={r} index={index} onPrefetch={() => {
                    preloadPage("postDetail");
                    prefetchPost(r.id);
                  }} />
                ))}
              </div>
            </Surface>
          )}
        </aside>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(false)}>
            <motion.div
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">删除帖子</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">删除后将返回讨论区列表。</p>
                </div>
                <button onClick={() => setConfirmDelete(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-800">{post.title}</div>
              <div className="mt-5 flex justify-end gap-3">
                <SecondaryButton onClick={() => setConfirmDelete(false)}>取消</SecondaryButton>
                <PrimaryButton tone="danger" onClick={handleDelete}>
                  <Trash2 size={16} />
                  删除
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </PageShell>
  );
}

function AuthorIdentity({
  author,
  username,
  avatarUrl,
  createdAt,
}: {
  author: string;
  username: string;
  avatarUrl?: string | null;
  createdAt?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${author} 的头像`} className="size-full object-cover" />
        ) : (
          getInitial(author)
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{author}</div>
        <div className="truncate text-xs text-slate-500">@{username} · {createdAt ? formatBeijingDateTime(createdAt) : "未知时间"}</div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm">
      <Icon size={14} />
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function CommentCard({ comment, index }: { comment: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
          {getInitial(comment.author_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-900">{comment.author_name}</span>
            <span className="text-xs text-slate-400">{formatBeijingDateTime(comment.created_at)}</span>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</div>
        </div>
      </div>
    </motion.div>
  );
}

function RelatedPostCard({ post, index, onPrefetch }: { post: any; index: number; onPrefetch: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
    >
      <Link
        to={`/forum/${post.id}`}
        className="group block rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 font-medium leading-5 text-slate-900">{post.title}</span>
          <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
        </div>
        <div className="mt-2 text-xs text-slate-400">赞 {post.like_count} · 评 {post.comment_count}</div>
      </Link>
    </motion.div>
  );
}
