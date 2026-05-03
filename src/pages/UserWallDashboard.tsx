import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, Pencil, Save, X, Megaphone, Power, Copy, Home, KeyRound, CalendarRange } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FloatingControls } from "@/components/FloatingControls";
import { censorText } from "@/lib/profanity";
import { ShareWallButton } from "@/components/ShareWallButton";
import { getDeyalPath, getDeyalShareUrl } from "@/lib/wallLinks";

const PAGE_SIZE = 25;

interface Profile { id: string; username: string; display_name: string; user_id: string; }
interface WPost { id: string; content: string; created_at: string; }
interface WNotif { id: string; message: string; created_at: string; active: boolean; }
interface WarningItem { id: string; message: string; created_at: string; read_at: string | null; }
interface Moderation { permanently_paused: boolean; paused_until: string | null; reason: string | null; }

export default function UserWallDashboard() {
  const { username } = useParams<{ username: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [denied, setDenied] = useState(false);
  const [posts, setPosts] = useState<WPost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [notifs, setNotifs] = useState<WNotif[]>([]);
  const [notifMsg, setNotifMsg] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [moderation, setModeration] = useState<Moderation | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shareUrl = profile ? getDeyalShareUrl(profile.username) : "";
  const wallPath = profile ? getDeyalPath(profile.username) : "/";
  const isPaused = !!moderation && (moderation.permanently_paused || (!!moderation.paused_until && new Date(moderation.paused_until) > new Date()));

  useEffect(() => { document.title = "আপনার ড্যাশবোর্ড — দেয়াল লিখন"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!username) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("id, username, display_name, user_id").ilike("username", username.toLowerCase()).maybeSingle();
      if (!data || data.user_id !== user.id) { setDenied(true); return; }
      setProfile(data as Profile);
      setDisplayName(data.display_name);
      const [{ data: warningRows }, { data: modRow }] = await Promise.all([
        supabase.from("user_warnings").select("id, message, created_at, read_at").eq("profile_id", data.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_moderation").select("permanently_paused, paused_until, reason").eq("profile_id", data.id).maybeSingle(),
      ]);
      setWarnings((warningRows ?? []) as WarningItem[]);
      setModeration((modRow ?? null) as Moderation | null);
    })();
  }, [user, authLoading, username, navigate]);

  const fetchPage = useCallback(async (p: number, pid: string) => {
    setLoading(true);
    const from = (p - 1) * PAGE_SIZE; const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase.from("wall_posts")
      .select("id, content, created_at", { count: "exact" })
      .eq("profile_id", pid).order("created_at", { ascending: false }).range(from, to);
    setPosts((data ?? []) as WPost[]); setTotal(count ?? 0); setLoading(false);
  }, []);

  const fetchNotifs = useCallback(async (pid: string) => {
    const { data } = await supabase.from("wall_notifications")
      .select("id, message, created_at, active").eq("profile_id", pid).order("created_at", { ascending: false });
    setNotifs((data ?? []) as WNotif[]);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchPage(page, profile.id); fetchNotifs(profile.id);
  }, [profile, page, fetchPage, fetchNotifs]);

  const toggleSelect = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };
  const selectAll = () => setSelected(new Set(posts.map(p => p.id)));
  const clearSel = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!profile || selected.size === 0) return;
    if (!confirm(`${selected.size} টি পোস্ট মুছবেন?`)) return;
    const { error } = await supabase.from("wall_posts").delete().in("id", Array.from(selected));
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("মুছে ফেলা হয়েছে"); clearSel(); fetchPage(page, profile.id);
  };

  const deleteOne = async (id: string) => {
    if (!profile) return;
    if (!confirm("এই পোস্টটি মুছবেন?")) return;
    const { error } = await supabase.from("wall_posts").delete().eq("id", id);
    if (error) return toast.error("মুছে ফেলা গেল না");
    fetchPage(page, profile.id);
  };

  const deleteAll = async () => {
    if (!profile) return;
    if (!confirm("আপনার দেয়ালের সব পোস্ট মুছবেন? এই কাজ ফেরানো যাবে না।")) return;
    const { error } = await supabase.from("wall_posts").delete().eq("profile_id", profile.id);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("সব মুছে ফেলা হয়েছে"); fetchPage(1, profile.id); setPage(1);
  };

  const deleteByDate = async () => {
    if (!profile) return;
    if (!fromDate || !toDate) return toast.error("তারিখ দিন");
    if (!confirm(`${fromDate} থেকে ${toDate} পর্যন্ত পোস্ট মুছবেন?`)) return;
    const start = new Date(fromDate).toISOString();
    const end = new Date(new Date(toDate).getTime() + 86400000).toISOString();
    const { error } = await supabase.from("wall_posts").delete()
      .eq("profile_id", profile.id).gte("created_at", start).lt("created_at", end);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("মুছে ফেলা হয়েছে"); fetchPage(1, profile.id); setPage(1);
  };

  const startEdit = (p: WPost) => { setEditingId(p.id); setEditText(p.content); };
  const saveEdit = async () => {
    if (!profile || !editingId) return;
    const { error } = await supabase.from("wall_posts").update({ content: editText }).eq("id", editingId);
    if (error) return toast.error("সংরক্ষণ হলো না");
    setEditingId(null); fetchPage(page, profile.id); toast.success("সংরক্ষিত");
  };

  const sendNotif = async () => {
    if (!profile || !notifMsg.trim()) return;
    setNotifLoading(true);
    const { error } = await supabase.from("wall_notifications").insert({ profile_id: profile.id, message: notifMsg.trim() });
    setNotifLoading(false);
    if (error) return toast.error("পাঠানো গেল না");
    setNotifMsg(""); toast.success("ঘোষণা পাঠানো হয়েছে"); fetchNotifs(profile.id);
  };
  const toggleNotif = async (n: WNotif) => {
    await supabase.from("wall_notifications").update({ active: !n.active }).eq("id", n.id);
    if (profile) fetchNotifs(profile.id);
  };
  const delNotif = async (id: string) => {
    await supabase.from("wall_notifications").delete().eq("id", id);
    if (profile) fetchNotifs(profile.id);
  };

  const saveDisplayName = async () => {
    if (!profile || !displayName.trim()) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", profile.id);
    setSavingName(false);
    if (error) return toast.error("সংরক্ষণ হলো না");
    toast.success("নাম পরিবর্তন হয়েছে");
  };

  const changePwd = async () => {
    if (newPwd.length < 6) return toast.error("কমপক্ষে ৬ অক্ষর");
    if (newPwd !== confirmPwd) return toast.error("পাসওয়ার্ড মিলছে না");
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) return toast.error(error.message);
    setNewPwd(""); setConfirmPwd(""); toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("লিংক কপি হয়েছে");
  };

  if (denied) return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-[hsl(48_30%_75%)]">
        <p className="text-2xl mb-3">প্রবেশাধিকার নেই</p>
        <Link to="/" className="text-primary underline">ফিরে যান</Link>
      </div>
    </main>
  );

  if (!profile) return (
    <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main>
  );

  return (
    <main className="min-h-screen px-4 py-10">
      <FloatingControls />
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link to={wallPath} className="inline-flex items-center text-sm text-[hsl(48_30%_75%)] hover:text-[hsl(48_60%_92%)]">
            <ArrowLeft className="mr-1 h-4 w-4" /> দেয়ালে যান
          </Link>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="mr-1.5 h-4 w-4" /> লিংক কপি</Button>
            <ShareWallButton url={shareUrl} title={`${displayName || username} এর দেয়ালে লিখুন`} />
            <Link to="/"><Button size="sm" variant="ghost" className="text-[hsl(48_30%_75%)]"><Home className="mr-1.5 h-4 w-4" /> মূল</Button></Link>
          </div>
        </div>

        {isPaused && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            আপনার আইডি অ্যাডমিন দ্বারা {moderation?.permanently_paused ? "স্থায়ীভাবে" : `${new Date(moderation?.paused_until || "").toLocaleString()} পর্যন্ত`} বন্ধ আছে।
            {moderation?.reason ? <span className="block mt-1 text-muted-foreground">কারণ: {censorText(moderation.reason)}</span> : null}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="card-glass rounded-2xl p-5 space-y-2 border-destructive/30">
            <h2 className="font-semibold text-destructive">অ্যাডমিন সতর্কবার্তা</h2>
            {warnings.map((w) => (
              <div key={w.id} className="rounded border border-border/40 p-3 text-sm">
                <p className="whitespace-pre-wrap break-words">{censorText(w.message)}</p>
                <time className="mt-1 block text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</time>
              </div>
            ))}
          </div>
        )}

        <div className="card-glass rounded-2xl p-6">
          <h1 className="text-2xl font-semibold mb-1">{profile.display_name} এর ড্যাশবোর্ড</h1>
          <p className="text-sm text-muted-foreground">আপনার দেয়াল: <span className="text-primary">{getDeyalPath(username || "")}</span></p>
        </div>

        {/* Profile + password */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-glass rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-1.5"><Pencil className="h-4 w-4" /> নাম পরিবর্তন</h2>
            <div className="space-y-2">
              <Label>প্রদর্শনের নাম</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
            </div>
            <Button onClick={saveDisplayName} disabled={savingName || isPaused} size="sm">
              {savingName ? "..." : "সংরক্ষণ"}
            </Button>
          </div>

          <div className="card-glass rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> পাসওয়ার্ড পরিবর্তন</h2>
            <Input type="password" placeholder="নতুন পাসওয়ার্ড" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            <Input type="password" placeholder="পুনরায় লিখুন" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            <Button onClick={changePwd} disabled={pwdLoading} size="sm">
              {pwdLoading ? "..." : "পরিবর্তন করুন"}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-glass rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-1.5"><Megaphone className="h-4 w-4" /> দেয়ালে ঘোষণা পাঠান</h2>
          <Textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} rows={3} maxLength={500} placeholder="আপনার ঘোষণা..." />
          <Button onClick={sendNotif} disabled={notifLoading || isPaused || !notifMsg.trim()} size="sm">
            {notifLoading ? "..." : "পাঠান"}
          </Button>
          {notifs.length > 0 && (
            <div className="space-y-2 pt-2">
              {notifs.map(n => (
                <div key={n.id} className="flex items-start gap-2 rounded border border-border/40 p-2 text-sm">
                  <span className={`mt-1 h-2 w-2 rounded-full ${n.active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  <p className="flex-1 whitespace-pre-wrap break-words">{n.message}</p>
                  <Button size="sm" variant="ghost" onClick={() => toggleNotif(n)}><Power className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delNotif(n.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk delete by date */}
        <div className="card-glass rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-1.5"><CalendarRange className="h-4 w-4" /> তারিখ অনুযায়ী মুছুন</h2>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={deleteByDate} variant="destructive" size="sm">তারিখ অনুযায়ী মুছুন</Button>
            <Button onClick={deleteAll} variant="destructive" size="sm">সব পোস্ট মুছুন</Button>
          </div>
        </div>

        {/* Posts */}
        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-semibold">পোস্ট ({total})</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>সব বাছাই</Button>
              <Button size="sm" variant="outline" onClick={clearSel}>মুক্ত</Button>
              <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={selected.size === 0}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> {selected.size} মুছুন
              </Button>
            </div>
          </div>
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
            <div className="space-y-2">
              {posts.map(p => (
                <div key={p.id} className="flex items-start gap-2 rounded border border-border/40 p-3">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                  <div className="flex-1 min-w-0">
                    {editingId === p.id ? (
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm">{censorText(p.content)}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                  </div>
                  {editingId === p.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteOne(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                </div>
              ))}
              {posts.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">কোনো পোস্ট নেই</p>}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>আগে</Button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>পরে</Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
