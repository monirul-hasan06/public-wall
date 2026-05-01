import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil, Save, Trash2, X, CalendarRange, ShieldAlert, KeyRound, UserPlus, Megaphone, Power, Ban, RotateCcw, SendHorizontal, Search, UserX, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FloatingControls } from "@/components/FloatingControls";

interface Post {
  id: string;
  content: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  created_at: string;
  moderation?: { permanently_paused: boolean; paused_until: string | null; reason: string | null } | null;
}

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Change password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Add admin
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  // Notifications
  type Notif = { id: string; message: string; created_at: string; active: boolean };
  const [notifMsg, setNotifMsg] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  // User controls
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [pauseMode, setPauseMode] = useState("7d");
  const [customPauseUntil, setCustomPauseUntil] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);

  const fetchNotifs = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id, message, created_at, active")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs((data ?? []) as Notif[]);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const [{ data: profileRows }, { data: moderationRows }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, username, display_name, created_at").order("created_at", { ascending: false }).limit(1000),
      (supabase as any).from("user_moderation").select("profile_id, permanently_paused, paused_until, reason"),
    ]);
    const moderationByProfile = new Map<string, ProfileRow["moderation"]>(
      (moderationRows ?? []).map((m: any) => [m.profile_id, {
        permanently_paused: !!m.permanently_paused,
        paused_until: m.paused_until ?? null,
        reason: m.reason ?? null,
      }])
    );
    setProfiles(((profileRows ?? []) as ProfileRow[]).map((p) => ({ ...p, moderation: moderationByProfile.get(p.id) ?? null })));
  }, []);

  const sendNotif = async () => {
    const msg = notifMsg.trim();
    if (!msg) return toast.error("খালি রাখা যাবে না");
    setNotifLoading(true);
    const { error } = await (supabase as any).from("notifications").insert({ message: msg, active: true });
    setNotifLoading(false);
    if (error) return toast.error("পাঠানো গেল না");
    toast.success("ঘোষণা পাঠানো হয়েছে");
    setNotifMsg("");
    fetchNotifs();
  };

  const toggleNotif = async (n: Notif) => {
    const { error } = await (supabase as any).from("notifications").update({ active: !n.active }).eq("id", n.id);
    if (error) return toast.error("পরিবর্তন ব্যর্থ");
    fetchNotifs();
  };

  const deleteNotif = async (id: string) => {
    if (!confirm("এই ঘোষণা মুছবেন?")) return;
    const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("মুছে ফেলা হয়েছে");
    fetchNotifs();
  };

  const changePassword = async () => {
    if (newPwd.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
    if (newPwd !== confirmPwd) return toast.error("নতুন পাসওয়ার্ড মিলছে না");
    setPwdLoading(true);
    const { data, error } = await supabase.functions.invoke("change-password", {
      body: { currentPassword: currentPwd, newPassword: newPwd },
    });
    setPwdLoading(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || "পরিবর্তন ব্যর্থ");
    toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  const addAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("সঠিক ইমেইল দিন");
    setAddAdminLoading(true);
    const { data, error } = await supabase.functions.invoke("add-admin", { body: { email } });
    setAddAdminLoading(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || "অ্যাডমিন যোগ ব্যর্থ");
    toast.success(`${email} এখন অ্যাডমিন (ডিফল্ট পাসওয়ার্ড: admin_pass06)`);
    setNewAdminEmail("");
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedPaused = !!selectedProfile?.moderation && (
    selectedProfile.moderation.permanently_paused ||
    (!!selectedProfile.moderation.paused_until && new Date(selectedProfile.moderation.paused_until) > new Date())
  );
  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.username.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q));
  }, [profiles, profileSearch]);

  const getPauseUntil = () => {
    if (pauseMode === "permanent") return null;
    if (pauseMode === "custom") return customPauseUntil ? new Date(customPauseUntil).toISOString() : null;
    const days = Number(pauseMode.replace("d", ""));
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const manageUser = async (action: "pause" | "unpause" | "warn" | "delete") => {
    if (!selectedProfile) return toast.error("একজন ইউজার নির্বাচন করুন");
    if (action === "delete" && !confirm(`@${selectedProfile.username} আইডি স্থায়ীভাবে মুছবেন?`)) return;
    setUserActionLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: {
        action,
        userId: selectedProfile.user_id,
        profileId: selectedProfile.id,
        permanent: pauseMode === "permanent",
        pausedUntil: getPauseUntil(),
        reason: pauseReason.trim(),
        message: warningMsg.trim(),
      },
    });
    setUserActionLoading(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || "কাজটি সম্পন্ন হলো না");
    toast.success("সম্পন্ন হয়েছে");
    if (action === "warn") setWarningMsg("");
    if (action === "pause" || action === "unpause") setPauseReason("");
    if (action === "delete") setSelectedProfileId("");
    fetchProfiles();
  };

  useEffect(() => {
    document.title = "Admin Dashboard — দেয়াল লিখন";
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/auth");
  }, [authLoading, user, isAdmin, navigate]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("posts")
      .select("id, content, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    setLoading(false);
    if (error) return toast.error("লোড করা গেল না");
    setPosts(data ?? []);
    setTotal(count ?? 0);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPage(page);
      fetchNotifs();
      fetchProfiles();
    }
  }, [page, fetchPage, fetchNotifs, fetchProfiles, isAdmin]);

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setEditText(p.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) return toast.error("খালি রাখা যাবে না");
    const { error } = await supabase.from("posts").update({ content: trimmed }).eq("id", editingId);
    if (error) return toast.error("আপডেট হলো না");
    toast.success("পোস্ট আপডেট হলো");
    setEditingId(null);
    fetchPage(page);
  };

  const deleteOne = async (id: string) => {
    if (!confirm("এই পোস্ট মুছবেন?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("মুছে ফেলা হয়েছে");
    fetchPage(page);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllOnPage = () => {
    setSelected((s) => {
      const n = new Set(s);
      const all = posts.every((p) => n.has(p.id));
      if (all) posts.forEach((p) => n.delete(p.id));
      else posts.forEach((p) => n.add(p.id));
      return n;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} টি পোস্ট মুছবেন?`)) return;
    const { error } = await supabase.from("posts").delete().in("id", Array.from(selected));
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success(`${selected.size} টি মুছে ফেলা হয়েছে`);
    setSelected(new Set());
    fetchPage(page);
  };

  const deleteAll = async () => {
    if (!confirm("⚠️ সব পোস্ট মুছে ফেলবেন? এই কাজ ফেরানো যাবে না।")) return;
    if (!confirm("আবার নিশ্চিত করুন — সবকিছু মুছবেন?")) return;
    const { error } = await supabase.from("posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("সব পোস্ট মুছে ফেলা হয়েছে");
    setSelected(new Set());
    setPage(1);
    fetchPage(1);
  };

  const deleteByDateRange = async () => {
    if (!fromDate || !toDate) return toast.error("তারিখ নির্বাচন করুন");
    const fromISO = new Date(fromDate + "T00:00:00").toISOString();
    const toISO = new Date(toDate + "T23:59:59").toISOString();
    if (!confirm(`${fromDate} থেকে ${toDate} পর্যন্ত সব পোস্ট মুছবেন?`)) return;
    const { error } = await supabase.from("posts").delete().gte("created_at", fromISO).lte("created_at", toISO);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("নির্বাচিত তারিখের পোস্ট মুছে ফেলা হয়েছে");
    setFromDate("");
    setToDate("");
    setPage(1);
    fetchPage(1);
  };

  if (authLoading || !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <FloatingControls showHome />
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <Link to="/" className="inline-flex items-center text-sm text-[hsl(48_30%_75%)] hover:text-[hsl(48_60%_92%)]">
            <ArrowLeft className="mr-1 h-4 w-4" /> দেয়ালে ফিরে যান
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(48_60%_92%)] drop-shadow">
            অ্যাডমিন ড্যাশবোর্ড
          </h1>
          <div className="text-xs text-[hsl(48_30%_75%)]/70">মোট: {total}</div>
        </header>

        <section className="card-glass rounded-lg p-4 space-y-4 mb-6 border-primary/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldAlert className="h-4 w-4" /> পূর্ণ ক্ষমতা
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selectAllOnPage}>
              এই পেজের সব নির্বাচন
            </Button>
            <Button size="sm" variant="destructive" disabled={selected.size === 0} onClick={deleteSelected}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> নির্বাচিত মুছুন ({selected.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteAll}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> এক ক্লিকে সব মুছুন
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <CalendarRange className="h-3.5 w-3.5" /> তারিখ অনুযায়ী মুছুন (যেমন 01/04/2026 → 30/04/2026)
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="from" className="text-xs">থেকে</Label>
                <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="to" className="text-xs">পর্যন্ত</Label>
                <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
              </div>
              <Button size="sm" variant="destructive" onClick={deleteByDateRange} disabled={!fromDate || !toDate}>
                মুছুন
              </Button>
            </div>
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <section className="card-glass rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <KeyRound className="h-4 w-4" /> পাসওয়ার্ড পরিবর্তন
            </div>
            <div className="space-y-2">
              <Input type="password" placeholder="বর্তমান পাসওয়ার্ড" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="h-9" />
              <Input type="password" placeholder="নতুন পাসওয়ার্ড (৬+)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="h-9" />
              <Input type="password" placeholder="নতুন পাসওয়ার্ড নিশ্চিত করুন" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="h-9" />
              <Button size="sm" onClick={changePassword} disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd} className="w-full">
                {pwdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "পরিবর্তন করুন"}
              </Button>
            </div>
          </section>

          <section className="card-glass rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <UserPlus className="h-4 w-4" /> নতুন অ্যাডমিন যোগ
            </div>
            <p className="text-xs text-muted-foreground">
              ডিফল্ট পাসওয়ার্ড: <code className="font-mono">admin_pass06</code> — পরে তিনি নিজে পরিবর্তন করতে পারবেন।
            </p>
            <Input type="email" placeholder="gmail@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="h-9" />
            <Button size="sm" onClick={addAdmin} disabled={addAdminLoading || !newAdminEmail} className="w-full">
              {addAdminLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "অ্যাডমিন বানান"}
            </Button>
          </section>
        </div>

        <section className="card-glass rounded-lg p-4 space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Megaphone className="h-4 w-4" /> ব্যবহারকারীদের নোটিফিকেশন পাঠান
          </div>
          <p className="text-xs text-muted-foreground">
            যা লিখবেন তা সব ব্যবহারকারীর দেয়ালে ঘোষণা হিসেবে দেখাবে।
          </p>
          <Textarea
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            placeholder="যেমন: আজ রাত ১০টায় দেয়াল কিছু সময়ের জন্য বন্ধ থাকবে..."
            rows={3}
            className="bg-background/60"
          />
          <Button size="sm" onClick={sendNotif} disabled={notifLoading || !notifMsg.trim()}>
            {notifLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Megaphone className="mr-1 h-3.5 w-3.5" /> পাঠান</>}
          </Button>

          {notifs.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">সাম্প্রতিক ঘোষণা</div>
              {notifs.map((n) => (
                <div key={n.id} className={`flex items-start gap-2 rounded border p-2 text-sm ${n.active ? "border-primary/30 bg-primary/5" : "border-border bg-background/40 opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-wrap break-words">{n.message}</p>
                    <time className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()} {n.active ? "" : "· নিষ্ক্রিয়"}
                    </time>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggleNotif(n)} title={n.active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}>
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteNotif(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[hsl(48_30%_75%)]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...
            </div>
          ) : posts.length === 0 ? (
            <div className="card-glass rounded-lg p-10 text-center text-muted-foreground">কোনো পোস্ট নেই।</div>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="card-glass rounded-lg p-4 flex gap-3">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  {editingId === p.id ? (
                    <>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="bg-background/60"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="mr-1 h-3.5 w-3.5" /> সংরক্ষণ
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="mr-1 h-3.5 w-3.5" /> বাতিল
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{p.content}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <time className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        </time>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> এডিট
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteOne(p.id)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> মুছুন
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </section>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[hsl(48_30%_75%)]">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              পূর্ববর্তী
            </Button>
            <span>পেজ {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              পরবর্তী
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
