import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Shield, UserPlus, LogIn } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "সাইন ইন — দেয়াল লিখন";
  }, []);

  const goAfterLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Admin?
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (role) return navigate("/admin");
    // Has profile? -> own wall dashboard
    const { data: profile } = await supabase
      .from("profiles").select("username").eq("user_id", user.id).maybeSingle();
    if (profile?.username) return navigate(`/wall/${profile.username}/dashboard`);
    navigate("/setup-wall");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("লগইন ব্যর্থ — সঠিক ইমেইল ও পাসওয়ার্ড দিন");
    toast.success("স্বাগতম");
    await goAfterLogin();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(u)) {
      return toast.error("ইউজারনেম: ৩-৩০ অক্ষর, শুধু a-z, 0-9 ও _");
    }
    if (!displayName.trim()) return toast.error("আপনার নাম দিন");
    if (password.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");

    setLoading(true);
    // Check username free
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
    if (existing) {
      setLoading(false);
      return toast.error("এই ইউজারনেম নেওয়া হয়ে গেছে");
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { username: u, display_name: displayName.trim() } },
    });
    if (error || !data.user) {
      setLoading(false);
      return toast.error(error?.message || "সাইনআপ ব্যর্থ");
    }

    // Create profile (works because we have a session right after signUp when email confirm is off,
    // or when on, the user must verify; we still try.)
    const { error: pErr } = await supabase.from("profiles").insert({
      user_id: data.user.id, username: u, display_name: displayName.trim(),
    });
    setLoading(false);
    if (pErr) {
      toast.error("প্রোফাইল তৈরি হলো না: " + pErr.message);
      return;
    }
    toast.success("আপনার দেয়াল তৈরি হয়েছে!");
    await goAfterLogin();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-glass rounded-2xl p-8 shadow-[var(--shadow-elegant)] animate-fade-in">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> দেয়ালে ফিরে যান
        </Link>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login"><LogIn className="mr-1.5 h-4 w-4" /> লগইন</TabsTrigger>
            <TabsTrigger value="signup"><UserPlus className="mr-1.5 h-4 w-4" /> সাইন আপ</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <h1 className="text-2xl font-semibold mb-1">আপনার দেয়ালে ফিরে আসুন</h1>
            <p className="text-sm text-muted-foreground mb-5">ইমেইল ও পাসওয়ার্ড দিয়ে সাইন ইন করুন।</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">ইমেইল</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">পাসওয়ার্ড</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {loading ? "অপেক্ষা করুন..." : "সাইন ইন"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <h1 className="text-2xl font-semibold mb-1">নিজের দেয়াল খুলুন</h1>
            <p className="text-sm text-muted-foreground mb-5">
              আপনার নিজের দেয়াল পাবেন: <code>/u/username</code> — লিংক শেয়ার করুন, বন্ধুরা এসে লিখবে।
            </p>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dname">আপনার নাম (দেয়ালে দেখানো হবে)</Label>
                <Input id="dname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uname">ইউজারনেম</Label>
                <Input id="uname" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required placeholder="যেমন: monirul" pattern="[a-z0-9_]{3,30}" />
                <p className="text-xs text-muted-foreground">আপনার লিংক হবে: <span className="text-primary">/u/{username || "username"}</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semail">ইমেইল</Label>
                <Input id="semail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spwd">পাসওয়ার্ড</Label>
                <Input id="spwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {loading ? "তৈরি হচ্ছে..." : "দেয়াল খুলুন"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-border/40 text-center">
          <Link to="/auth?admin=1" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            <Shield className="mr-1 h-3 w-3" /> অ্যাডমিন লগইন (একই ফর্মে ইমেইল-পাসওয়ার্ড দিন)
          </Link>
        </div>
      </div>
    </main>
  );
}
