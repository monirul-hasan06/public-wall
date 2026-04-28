import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

const MAX = 1000;

export function WriteBox({ onPosted }: { onPosted: () => void }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Write something before posting");
      return;
    }
    if (trimmed.length > MAX) {
      toast.error(`Message too long (max ${MAX} characters)`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({ content: trimmed });
    setSubmitting(false);

    if (error) {
      toast.error("Could not post. Please try again.");
      return;
    }
    setContent("");
    toast.success("Posted to the wall");
    onPosted();
  };

  return (
    <div className="card-glass rounded-2xl p-5 shadow-[var(--shadow-elegant)] animate-fade-in">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something on the wall..."
        rows={3}
        maxLength={MAX}
        className="resize-none border-0 bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {content.length}/{MAX}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
