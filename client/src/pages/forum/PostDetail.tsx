import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { DetailSkeleton } from "../../components/skeleton/Skeletons";
import { useMutationToast } from "../../components/ui/toast";
import { useComments, usePost, usePrefetchPost, useRelatedPosts } from "../../hooks/api";

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
    if (!confirm("确定删除？") || !postId) return;
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
    <div className="p-6 max-w-4xl">
      <Link to="/forum" className="text-sm text-slate-500 hover:underline">&larr; 返回讨论区</Link>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          {post.is_essence && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">精华</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
          <span>{post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
          <span>👁 {post.view_count}</span>
        </div>
        {post.tags?.length > 0 && (
          <div className="flex gap-1 mt-2">
            {post.tags.map((t: any) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: t.color + "20", color: t.color }}>{t.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow mt-4 whitespace-pre-wrap">
        {post.content}
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={handleVote} className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800">
          👍 点赞 ({post.like_count})
        </button>
        {String(post.user_id) === String(currentUserId) && (
          <button onClick={handleDelete} className="text-red-600 text-sm hover:underline">删除</button>
        )}
      </div>

      {post.session_id && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          该帖子来自 <Link to={`/chat/${post.session_id}`} className="text-blue-600 hover:underline">AI 对话 #{post.session_id}</Link>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">相关帖子</h2>
          <div className="space-y-2">
            {related.map((r: any) => (
              <Link
                key={r.id}
                to={`/forum/${r.id}`}
                className="block bg-white p-3 rounded shadow text-sm hover:shadow-md"
                onMouseEnter={() => prefetchPost(r.id)}
                onFocus={() => prefetchPost(r.id)}
              >
                <span className="font-medium">{r.title}</span>
                <span className="text-slate-500 ml-2">👍 {r.like_count} 💬 {r.comment_count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">评论 ({post.comment_count})</h2>
        <form onSubmit={handleComment} className="mb-4">
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            placeholder="写下你的看法..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button className="mt-2 bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800">发布评论</button>
        </form>

        <div className="space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="bg-white p-3 rounded shadow">
              <div className="text-sm">
                <span className="font-medium">{c.author_name}</span>
                <span className="text-slate-400 ml-2">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap">{c.content}</div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-slate-500 text-sm">暂无评论</div>}
        </div>
      </div>
    </div>
  );
}
