import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FloatingControls } from "@/components/FloatingControls";
import { ShareWallButton } from "@/components/ShareWallButton";
import { Search, Home as HomeIcon, ExternalLink, Loader2, Users } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "সব দেয়াল — দেয়াল লিখন";
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter(
      p => p.username.toLowerCase().includes(s) || p.display_name.toLowerCase().includes(s)
    );
  }, [q, profiles]);

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <FloatingControls />
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 text-center animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[hsl(48_60%_92%)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            সব দেয়াল
          </h1>
          <p className="mt-2 text-[hsl(48_30%_75%)]/90">
            যে কোনো দেয়াল দেখুন এবং সেখানে কিছু লিখুন
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link to="/">
              <Button size="sm" variant="ghost" className="text-[hsl(48_30%_75%)]">
                <HomeIcon className="mr-1.5 h-4 w-4" /> মূল দেয়াল
              </Button>
            </Link>
          </div>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম বা ইউজারনেম দিয়ে খুঁজুন..."
            className="pl-9 bg-background/70 backdrop-blur"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[hsl(48_30%_75%)]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...
          </div>
        ) : filtered.length === 0 ? (
          <div className="poster rounded-sm p-10 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-60" />
            {q ? "কাউকে খুঁজে পাওয়া যায়নি" : "এখনো কেউ নিজের দেয়াল খোলেনি"}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((p) => {
              const url = `${window.location.origin}/u/${p.username}`;
              return (
                <li
                  key={p.id}
                  className="card-glass rounded-lg p-4 flex items-center justify-between gap-3 hover:bg-accent/10 transition-colors"
                >
                  <Link to={`/u/${p.username}`} className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <ShareWallButton url={url} title={`${p.display_name} এর দেয়ালে লিখুন`} label="" />
                    <Link to={`/u/${p.username}`}>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="mr-1.5 h-4 w-4" /> লিখুন
                      </Button>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-10 text-center text-xs text-[hsl(48_30%_75%)]/70">
          {filtered.length} টি দেয়াল
        </footer>
      </div>
    </main>
  );
}
