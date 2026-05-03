import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PostCard, type Post } from "@/components/PostCard";
import { WallPagination } from "@/components/WallPagination";
import { FloatingControls } from "@/components/FloatingControls";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Megaphone, X, Copy, LayoutDashboard, Home } from "lucide-react";
import { ShareWallButton } from "@/components/ShareWallButton";
import { censorText, containsProfanity } from "@/lib/profanity";
import { getDeyalDashboardPath, getDeyalShareUrl } from "@/lib/wallLinks";
import { SiteFooter } from "@/components/SiteFooter";

const PAGE_SIZE = 10;
const MAX = 1000;

const LINK_PATTERNS: RegExp[] = [
  /https?:\/\//i, /www\./i,
  /\b[a-z0-9-]+\.(com|net|org|io|co|in|info|xyz|dev|app|me|tv|us|uk|bd|biz|online|site|live|fb|gl|ly)\b/i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
];
const containsLink = (t: string) => LINK_PATTERNS.some((re) => re.test(t));

interface Profile { id: string; username: string; display_name: string; user_id: string; }
interface WallNotif { id: string; message: string; created_at: string; }
interface Moderation { permanently_paused: boolean; paused_until: string | null; reason: string | null; }

export default function UserWall() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notifs, setNotifs] = useState<WallNotif[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [moderation, setModeration] = useState<Moderation | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isOwner = !!user && !!profile && user.id === profile.user_id;
  const shareUrl = profile ? getDeyalShareUrl(profile.username) : "";
  const isPaused = !!moderation && (moderation.permanently_paused || (!!moderation.paused_until && new Date(moderation.paused_until) > new Date()));

  useEffect(() => {
    const key = `dismissed_wall_notifs_${username}`;
    try { setDismissed(JSON.parse(localStorage.getItem(key) || "[]")); } catch { /* noop */ }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const uname = username.trim().toLowerCase();
    document.title = `${uname} এর দেয়াল — দেয়াল লিখন`;
    setNotFound(false);
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, username, display_name, user_id").ilike("username", uname).maybeSingle();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setProfile(data as Profile);
      const { data: mod } = await (supabase as any)
        .from("user_moderation")
        .select("permanently_paused, paused_until, reason")
        .eq("profile_id", data.id)
        .maybeSingle();
      setModeration((mod ?? null) as Moderation | null);
    })();
  }, [username]);

  const fetchPage = useCallback(async (p: number, profileId: string) => {
    setLoading(true);
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("wall_posts").select("id, content, created_at", { count: "exact" })
      .eq("profile_id", profileId).order("created_at", { ascending: false }).range(from, to);
    setPosts((data ?? []) as Post[]); setTotal(count ?? 0); setLoading(false);
  }, []);

  const fetchNotifs = useCallback(async (profileId: string) => {
    const { data } = await supabase.from("wall_notifications")
      .select("id, message, created_at").eq("profile_id", profileId).eq("active", true)
      .order("created_at", { ascending: false }).limit(5);
    setNotifs((data ?? []) as WallNotif[]);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchPage(page, profile.id);
    fetchNotifs(profile.id);
    const ch = supabase.channel(`wall-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wall_notifications", filter: `profile_id=eq.${profile.id}` }, () => fetchNotifs(profile.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, page, fetchPage, fetchNotifs]);

  const handlePost = async () => {
    if (!profile) return;
    if (isPaused) return toast.error("এই দেয়ালটি আপাতত বন্ধ আছে");
    const trimmed = content.trim();
    if (!trimmed) return toast.error("কিছু লিখুন");
    if (trimmed.length > MAX) return toast.error(`সর্বোচ্চ ${MAX} অক্ষর`);
    if (containsLink(trimmed)) return toast.error("লিংক দেওয়া যাবে না");
    setSubmitting(true);
    const { error } = await supabase.from("wall_posts").insert({ profile_id: profile.id, content: trimmed });
    setSubmitting(false);
    if (error) return toast.error("পেস্ট হলো না");
    setContent("");
    toast.success("দেয়ালে আঁটানো হলো");
    fetchPage(1, profile.id); setPage(1);
  };

  const dismiss = (id: string) => {
    const next = [...dismissed, id]; setDismissed(next);
    localStorage.setItem(`dismissed_wall_notifs_${username}`, JSON.stringify(next));
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("লিংক কপি হয়েছে");
  };

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-[hsl(48_30%_75%)]">
        <p className="text-2xl mb-3">এই দেয়াল খুঁজে পাওয়া যায়নি</p>
        <Link to="/" className="text-primary underline">মূল দেয়ালে ফিরে যান</Link>
      </div>
    </main>
  );

  const visibleNotifs = notifs.filter(n => !dismissed.includes(n.id));

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <FloatingControls />
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 text-center animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[hsl(48_60%_92%)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            {profile?.display_name || "..."}
          </h1>
          <p className="mt-2 text-[hsl(48_30%_75%)]/90">এর ব্যক্তিগত দেয়াল</p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-4 w-4" /> লিংক কপি
            </Button>
            <ShareWallButton
              url={shareUrl}
              title={`${profile?.display_name || username} এর দেয়ালে লিখুন`}
            />
            <Link to="/"><Button size="sm" variant="ghost" className="text-[hsl(48_30%_75%)]"><Home className="mr-1.5 h-4 w-4" /> মূল দেয়াল</Button></Link>
            {isOwner && (
              <Link to={getDeyalDashboardPath(profile?.username || "")}>
                <Button size="sm" variant="outline"><LayoutDashboard className="mr-1.5 h-4 w-4" /> আপনার ড্যাশবোর্ড</Button>
              </Link>
            )}
          </div>
        </header>

        {isPaused && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            এই দেয়ালটি অ্যাডমিন দ্বারা {moderation?.permanently_paused ? "স্থায়ীভাবে" : `${new Date(moderation?.paused_until || "").toLocaleString()} পর্যন্ত`} বন্ধ করা হয়েছে।
            {moderation?.reason ? <span className="block mt-1 text-muted-foreground">কারণ: {censorText(moderation.reason)}</span> : null}
          </div>
        )}

        {visibleNotifs.length > 0 && (
          <div className="space-y-2 mb-6 animate-fade-in">
            {visibleNotifs.map(n => (
              <div key={n.id} className="relative flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 backdrop-blur px-4 py-3 pr-10 shadow-lg">
                <Megaphone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold mb-0.5">
                    {profile?.display_name} এর ঘোষণা
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{censorText(n.message)}</p>
                </div>
                <button onClick={() => dismiss(n.id)} aria-label="বন্ধ" className="absolute top-2 right-2 p-1 rounded hover:bg-foreground/10 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <section className="mb-10">
          <div className="relative poster rounded-sm p-6 pt-8" style={{ transform: "rotate(-0.6deg)" }}>
            <span className="tape tape-tl" /><span className="tape tape-tr" />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={`${profile?.display_name || ""} এর দেয়ালে কিছু লিখুন... (কেউ জানবে না কে লিখেছে)`}
              rows={4} maxLength={MAX}
              disabled={isPaused}
              className="resize-none border-0 bg-transparent text-base text-[hsl(20_30%_15%)] placeholder:text-[hsl(20_25%_35%)]/60 focus-visible:ring-0 font-medium" />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-[hsl(20_25%_30%)] tabular-nums">{content.length}/{MAX}</span>
              <Button onClick={handlePost} disabled={submitting || isPaused || !content.trim()}
                className="bg-[hsl(15_70%_35%)] text-[hsl(48_60%_92%)] hover:bg-[hsl(15_75%_30%)] font-semibold tracking-wide">
                {submitting ? "পেস্ট হচ্ছে..." : isPaused ? "বন্ধ আছে" : "পেস্ট"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-[hsl(20_25%_30%)]/80">
              শুধু লেখা — কোনো লিংক নয়। আপত্তিকর শব্দ স্বয়ংক্রিয়ভাবে সেন্সর হবে।
            </p>
          </div>
        </section>

        <section className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[hsl(48_30%_75%)]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...
            </div>
          ) : posts.length === 0 ? (
            <div className="poster rounded-sm p-10 text-center">এই দেয়াল ফাঁকা। প্রথম পোস্টার আপনিই আঁটান।</div>
          ) : (
            posts.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} isAdmin={false} onDelete={() => {}} />
            ))
          )}
        </section>

        <div className="mt-10">
          <WallPagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        </div>

        <SiteFooter extraTop={<div>{total} টি পোস্ট</div>} />
      </div>
    </main>
  );
}
