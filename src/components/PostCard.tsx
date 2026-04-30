import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { censorText } from "@/lib/profanity";

export interface Post {
  id: string;
  content: string;
  created_at: string;
}

const VARIANTS = ["", "poster-2", "poster-3", "poster-4"];
const ROTATIONS = [-1.2, 0.8, -0.5, 1.4, -0.9, 0.6];

export function PostCard({
  post,
  index = 0,
  isAdmin,
  selected,
  onToggleSelect,
  onDelete,
}: {
  post: Post;
  index?: number;
  isAdmin: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const variant = VARIANTS[index % VARIANTS.length];
  const rotation = ROTATIONS[index % ROTATIONS.length];

  return (
    <article
      className={`relative poster ${variant} rounded-sm p-5 pt-7 animate-slide-up transition-transform hover:scale-[1.01]`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span className="tape tape-c" />
      {isAdmin && onToggleSelect && (
        <div className="absolute top-2 left-2 bg-[hsl(48_60%_92%)] rounded p-1 shadow">
          <Checkbox
            checked={!!selected}
            onCheckedChange={() => onToggleSelect(post.id)}
            className="border-[hsl(20_30%_25%)] data-[state=checked]:bg-[hsl(15_70%_35%)] data-[state=checked]:border-[hsl(15_70%_35%)]"
          />
        </div>
      )}
      <p className="whitespace-pre-wrap break-words text-[hsl(20_30%_15%)] leading-relaxed font-medium">
        {censorText(post.content)}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <time className="text-xs text-[hsl(20_25%_30%)]">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </time>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="h-7 text-[hsl(0_70%_40%)] hover:bg-[hsl(0_70%_40%)]/10 hover:text-[hsl(0_70%_35%)]"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            মুছুন
          </Button>
        )}
      </div>
    </article>
  );
}
