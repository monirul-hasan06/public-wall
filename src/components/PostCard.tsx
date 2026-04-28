import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export interface Post {
  id: string;
  content: string;
  created_at: string;
}

export function PostCard({
  post,
  isAdmin,
  onDelete,
}: {
  post: Post;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="card-glass rounded-2xl p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] animate-slide-up">
      <p className="whitespace-pre-wrap break-words text-foreground/95 leading-relaxed">
        {post.content}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <time className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </time>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
