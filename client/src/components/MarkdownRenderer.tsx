import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

interface MarkdownRendererProps {
  content: string;
  /** "agent" = 亮色背景，"user" = 暗色背景 */
  variant?: "agent" | "user";
}

export default function MarkdownRenderer({ content, variant = "agent" }: MarkdownRendererProps) {
  return (
    <div className={variant === "user" ? "md-content-dark" : "md-content"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
