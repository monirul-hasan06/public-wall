import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { WriteBox } from "@/components/WriteBox";
import { PostCard, type Post } from "@/components/PostCard";
import { WallPagination } from "@/components/WallPagination";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2, Moon, Sun, LayoutDashboard, EyeOff } from "lucide-react";

const PAGE_SIZE = 10;

const Index = () => {
  const { user, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
      {/* Floating theme toggle */}
      <button
        onClick={toggle}
        aria-label="দিন/রাত মোড"
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full card-glass flex items-center justify-center text-[hsl(48_60%_92%)] hover:scale-105 transition-transform shadow-lg"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 text-center animate-fade-in">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[hsl(48_60%_92%)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            দেয়াল লিখন
          </h1>
          <p className="mt-3 text-[hsl(48_30%_75%)]/90">
            একটি ভাবনা লিখুন। দেয়ালে আঁটিয়ে দিন।
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-[hsl(48_30%_75%)]/20 text-[11px] text-[hsl(48_30%_75%)]/90">
            <EyeOff className="h-3 w-3" />
            কেউ জানবে না কে লিখেছে — অ্যাডমিনও না
          </div>

          {user && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              {isAdmin && (
                <>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/40">
                    অ্যাডমিন
                  </span>
                  <Link to="/admin">
                    <Button size="sm" variant="outline">
                      <LayoutDashboard className="mr-1.5 h-4 w-4" /> ড্যাশবোর্ড
                    </Button>
                  </Link>
                </>
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
                isAdmin={false}
                onDelete={() => {}}
              />
            ))
          )}
        </section>

        <div className="mt-10">
          <WallPagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>

        <footer className="mt-16 text-center text-xs text-[hsl(48_30%_75%)]/70 space-y-3">
          <div>{total} টি পোস্ট দেয়ালে</div>
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
