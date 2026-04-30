import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function SetupWall() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    document.title = "দেয়াল তৈরি করুন";
    (async () => {
      const { data } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
      if (data?.username) navigate(`/wall/${data.username}/dashboard`);
    })();
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(u)) return toast.error("৩-৩০ অক্ষর, a-z, 0-9, _");
    if (!displayName.trim()) return toast.error("নাম দিন");
    if (!user) return;
    setSubmitting(true);
    const { data: ex } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
    if (ex) { setSubmitting(false); return toast.error("এই ইউজারনেম নেওয়া হয়ে গেছে"); }
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, username: u, display_name: displayName.trim() });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("দেয়াল তৈরি হয়েছে!");
    navigate(`/wall/${u}/dashboard`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-glass rounded-2xl p-8 animate-fade-in">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground mb-6"><ArrowLeft className="mr-1 h-4 w-4" /> ফিরে যান</Link>
        <h1 className="text-2xl font-semibold mb-1">আপনার দেয়াল তৈরি করুন</h1>
        <p className="text-sm text-muted-foreground mb-5">ইউজারনেম পরে পরিবর্তন করা যাবে না।</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>আপনার নাম</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label>ইউজারনেম</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,30}" />
            <p className="text-xs text-muted-foreground">লিংক: <span className="text-primary">/u/{username || "username"}</span></p>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? "..." : "তৈরি করুন"}</Button>
        </form>
      </div>
    </main>
  );
}
