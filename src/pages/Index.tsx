import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WriteBox } from "@/components/WriteBox";
import { PostCard, type Post } from "@/components/PostCard";
import { WallPagination } from "@/components/WallPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2, Trash2, CalendarRange } from "lucide-react";

const PAGE_SIZE = 10;

const Index = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
    if (error) {
      toast.error("পোস্ট লোড করা গেল না");
      return;
    }
    setPosts(data ?? []);
    setTotal(count ?? 0);
  }, []);

  useEffect(() => {
    document.title = "দেয়াল লিখন";
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const handlePosted = () => {
    if (page !== 1) setPage(1);
    else fetchPage(1);
  };

  const handleDelete = async (id: string) => {
    const prev = posts;
    setPosts(posts.filter((p) => p.id !== id));
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      setPosts(prev);
      toast.error("মুছে ফেলা গেল না");
      return;
    }
    toast.success("পোস্ট মুছে ফেলা হয়েছে");
    fetchPage(page);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected((s) => {
      const next = new Set(s);
      const all = posts.every((p) => next.has(p.id));
      if (all) posts.forEach((p) => next.delete(p.id));
      else posts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} টি পোস্ট মুছবেন?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("posts").delete().in("id", ids);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success(`${ids.length} টি পোস্ট মুছে ফেলা হয়েছে`);
    setSelected(new Set());
    fetchPage(page);
  };

  const deleteAll = async () => {
    if (!confirm("সব পোস্ট মুছে ফেলবেন? এই কাজ ফেরানো যাবে না।")) return;
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
    const { error } = await supabase
      .from("posts")
      .delete()
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    if (error) return toast.error("মুছে ফেলা গেল না");
    toast.success("নির্বাচিত তারিখের পোস্ট মুছে ফেলা হয়েছে");
    setFromDate("");
    setToDate("");
    setPage(1);
    fetchPage(1);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("সাইন আউট হয়ে গেছেন");
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center animate-fade-in">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[hsl(48_60%_92%)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            দেয়াল লিখন
          </h1>
          <p className="mt-3 text-[hsl(48_30%_75%)]/80">
            একটি ভাবনা লিখুন। দেয়ালে আঁটিয়ে দিন।
          </p>

          {user && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {isAdmin && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/40">
                  অ্যাডমিন
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-[hsl(48_30%_75%)] hover:text-[hsl(48_60%_92%)]">
                <LogOut className="mr-1.5 h-4 w-4" /> সাইন আউট
              </Button>
            </div>
          )}
        </header>

        <section className="mb-10">
          <WriteBox onPosted={handlePosted} />
        </section>

        {isAdmin && (
          <section className="mb-8 card-glass rounded-lg p-4 space-y-3 border-primary/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Trash2 className="h-4 w-4" /> অ্যাডমিন কন্ট্রোল
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={selectAllOnPage}>
                এই পেজের সব নির্বাচন
              </Button>
              <Button size="sm" variant="destructive" disabled={selected.size === 0} onClick={deleteSelected}>
                নির্বাচিত মুছুন ({selected.size})
              </Button>
              <Button size="sm" variant="destructive" onClick={deleteAll}>
                সব মুছুন
              </Button>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <CalendarRange className="h-3.5 w-3.5" /> তারিখ অনুযায়ী মুছুন
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
        )}

        <section className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[hsl(48_30%_75%)]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...
            </div>
          ) : posts.length === 0 ? (
            <div className="poster rounded-sm p-10 text-center">
              দেয়াল ফাঁকা। প্রথম পোস্টার আপনিই আঁটান।
            </div>
          ) : (
            posts.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                index={i}
                isAdmin={isAdmin}
                selected={selected.has(p.id)}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
              />
            ))
          )}
        </section>

        <div className="mt-10">
          <WallPagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>

        <footer className="mt-16 text-center text-xs text-[hsl(48_30%_75%)]/70 space-y-3">
          <div>
            {total} টি পোস্ট দেয়ালে
          </div>
          <div>
            Made by{" "}
            <a
              href="https://www.facebook.com/monirul.hasan06"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-400 font-semibold underline-offset-4 hover:underline"
            >
              Monirul Hasan Mithu
            </a>
          </div>
          {!user && (
            <div>
              <Link to="/auth" className="inline-flex items-center text-[hsl(48_30%_75%)]/60 hover:text-[hsl(48_60%_92%)] transition-colors">
                <LogIn className="mr-1 h-3 w-3" /> Admin Login
              </Link>
            </div>
          )}
        </footer>
      </div>
    </main>
  );
};

export default Index;
