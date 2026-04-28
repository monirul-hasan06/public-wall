import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX = 1000;

// Detect URLs / links / domains so users can only post plain words
const LINK_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /www\./i,
  /\b[a-z0-9-]+\.(com|net|org|io|co|in|info|xyz|dev|app|me|tv|us|uk|bd|biz|online|site|live|fb|gl|ly)\b/i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /<\s*a\s+/i,
  /\[[^\]]+\]\([^)]+\)/, // markdown links
];

function containsLink(text: string) {
  return LINK_PATTERNS.some((re) => re.test(text));
}

export function WriteBox({ onPosted }: { onPosted: () => void }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("কিছু লিখে তবেই পেস্ট করুন");
      return;
    }
    if (trimmed.length > MAX) {
      toast.error(`বেশি বড় হয়ে গেছে (সর্বোচ্চ ${MAX} অক্ষর)`);
      return;
    }
    if (containsLink(trimmed)) {
      toast.error("এখানে লিংক দেওয়া যাবে না — শুধু লেখা চলবে");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({ content: trimmed });
    setSubmitting(false);

    if (error) {
      toast.error("পেস্ট করা গেল না, আবার চেষ্টা করুন");
      return;
    }
    setContent("");
    toast.success("দেয়ালে আঁটানো হলো");
    onPosted();
  };

  return (
    <div className="relative poster rounded-sm p-6 pt-8 animate-fade-in" style={{ transform: "rotate(-0.6deg)" }}>
      <span className="tape tape-tl" />
      <span className="tape tape-tr" />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="দেয়ালে কিছু লিখুন... (যা ইচ্ছে, মন খুলে — কেউ জানবে না কে লিখেছে)"
        rows={4}
        maxLength={MAX}
        className="resize-none border-0 bg-transparent text-base text-[hsl(20_30%_15%)] placeholder:text-[hsl(20_25%_35%)]/60 focus-visible:ring-0 font-medium"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-[hsl(20_25%_30%)] tabular-nums">
          {content.length}/{MAX}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="bg-[hsl(15_70%_35%)] text-[hsl(48_60%_92%)] hover:bg-[hsl(15_75%_30%)] font-semibold tracking-wide"
        >
          {submitting ? "পেস্ট হচ্ছে..." : "পেস্ট"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-[hsl(20_25%_30%)]/80">
        শুধু লেখা পোস্ট করা যাবে — কোনো লিংক/URL দেওয়া যাবে না।
      </p>
    </div>
  );
}
