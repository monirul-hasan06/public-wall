import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WriteBox } from "@/components/WriteBox";
import { PostCard, type Post } from "@/components/PostCard";
import { WallPagination } from "@/components/WallPagination";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2, ScrollText } from "lucide-react";

const PAGE_SIZE = 10;

const Index = () => {
  const { user, isAdmin } = useAuth();
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
      toast.error("Could not load posts");
      return;
    }
    setPosts(data ?? []);
    setTotal(count ?? 0);
  }, []);

  useEffect(() => {
    document.title = "DEYAL LIKHON — A digital writing wall";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "DEYAL LIKHON is an open digital wall where anyone can leave a short message for the world to read.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
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
      toast.error("Could not delete post");
      return;
    }
    toast.success("Post deleted");
    fetchPage(page);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-border bg-secondary/40 text-xs text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5 text-primary" />
            A public writing wall
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gradient">
            DEYAL LIKHON
          </h1>
          <p className="mt-3 text-muted-foreground">
            Leave a thought. Read others. No sign-up needed.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <span className="px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30">
                    Admin
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1.5 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">
                  <LogIn className="mr-1.5 h-4 w-4" /> Admin login
                </Link>
              </Button>
            )}
          </div>
        </header>

        <section className="mb-8">
          <WriteBox onPosted={handlePosted} />
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading wall...
            </div>
          ) : posts.length === 0 ? (
            <div className="card-glass rounded-2xl p-10 text-center text-muted-foreground">
              The wall is empty. Be the first to write.
            </div>
          ) : (
            posts.map((p) => (
              <PostCard key={p.id} post={p} isAdmin={isAdmin} onDelete={handleDelete} />
            ))
          )}
        </section>

        <div className="mt-10">
          <WallPagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {total} {total === 1 ? "message" : "messages"} on the wall
        </footer>
      </div>
    </main>
  );
};

export default Index;
