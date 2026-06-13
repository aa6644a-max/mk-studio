import type { Post } from "@/lib/types";
import { POST_TYPE_META } from "@/lib/types";
import { posterColor } from "@/lib/colors";

export default function RecentReviewCard({ post }: { post: Post }) {
  const meta = POST_TYPE_META[post.postType];
  return (
    <div className="panel overflow-hidden">
      <div
        className="flex aspect-[16/9] items-center justify-center text-3xl text-white/90"
        style={{ background: posterColor(post.movieTitle) }}
      >
        {meta.icon}
      </div>
      <div className="p-4">
        <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {meta.label}
        </div>
        <div className="mt-0.5 truncate font-bold text-[var(--text-primary)]">
          {post.movieTitle}
        </div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          {post.timestamp.slice(0, 10)} ·{" "}
          {post.status === "published" ? "발행됨" : "임시저장"}
        </div>
      </div>
    </div>
  );
}
