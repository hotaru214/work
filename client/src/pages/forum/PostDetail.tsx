import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Eye, Heart, MessageCircle, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { DetailSkeleton } from "../../components/skeleton/Skeletons";
import { useMutationToast } from "../../components/ui/toast";
import { useComments, usePost, usePrefetchPost, useRelatedPosts } from "../../hooks/api";
import { EmptyState, IconBadge, PrimaryButton, SecondaryButton, Surface, TextAreaField } from "../../components/PageScaffold";

function getCurrentUserId() {
  try {
    const tokenPayload = localStorage.getItem("ch_token")?.split(".")[1];
    if (!tokenPayload) return null;
    return JSON.parse(atob(tokenPayload)).sub;
  } catch {
    return null;
  }
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Link to="/forum" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:-translate-x-0.5 hover:text-slate-950">
        <ArrowLeft size={16} />
        返回讨论区
      </Link>

      <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-slate-100 p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {post.is_essence && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">精华</span>}
              {post.tags?.map((t: any) => (
                <span key={t.id} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: t.color + "20", color: t.color }}>
                  #{t.name}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950">{post.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{post.author_name}</span>
              <span>{new Date(post.created_at).toLocaleString("zh-CN")}</span>
              <span className="inline-flex items-center gap-1"><Eye size={15} />{post.view_count}</span>
            </div>
          </div>

          <div className="p-6">
            <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-800">{post.content}</div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={handleVote} className="group">
                <Heart size={16} className="transition group-hover:fill-white" />
                点赞 ({post.like_count})
              </PrimaryButton>
              {String(post.user_id) === String(currentUserId) && (
                <SecondaryButton className="text-rose-600 hover:border-rose-200 hover:bg-rose-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} />
                  删除
                </SecondaryButton>
              )}
            </div>
          </div>
        </Surface>
      </motion.article>

      {post.session_id && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          该帖子来自 <Link to={`/chat/${post.session_id}`} className="font-medium hover:underline">AI 对话 #{post.session_id}</Link>
        </div>
      )}

      {related.length > 0 && (
        <Surface className="mt-6 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-950">相关帖子</h2>
          <div className="space-y-2">
            {related.map((r: any, index: number) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}>
                <Link
                  to={`/forum/${r.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3 text-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  onMouseEnter={() => prefetchPost(r.id)}
                  onFocus={() => prefetchPost(r.id)}
                >
                  <span className="line-clamp-1 font-medium text-slate-900">{r.title}</span>
                  <span className="shrink-0 text-slate-500">赞 {r.like_count} · 评 {r.comment_count}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </Surface>
      )}

      <Surface className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-3">
          <IconBadge icon={MessageCircle} tone="blue" />
          <div>
            <h2 className="text-sm font-semibold text-slate-950">评论 ({post.comment_count})</h2>
            <p className="text-xs text-slate-500">补充你的观点或继续讨论。</p>
          </div>
        </div>
        <form onSubmit={handleComment} className="mb-4">
          <TextAreaField
            rows={3}
            placeholder="写下你的看法..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <PrimaryButton className="mt-3" disabled={!commentText.trim()}>
            发布评论
          </PrimaryButton>
        </form>

        {comments.length === 0 ? (
          <EmptyState title="暂无评论" description="成为第一个评论的人。" icon={MessageCircle} />
        ) : (
          <div className="space-y-3">
            {comments.map((c: any, index: number) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
                className="rounded-xl border border-slate-100 bg-white p-4"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{c.author_name}</span>
                  <span className="ml-2 text-slate-400">{new Date(c.created_at).toLocaleString("zh-CN")}</span>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{c.content}</div>
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

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
                <PrimaryButton className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300" onClick={handleDelete}>
                  <Trash2 size={16} />
                  删除
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
