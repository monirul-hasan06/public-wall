import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Shield } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Admin Login — দেয়াল লিখন";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("লগইন ব্যর্থ — সঠিক ইমেইল ও পাসওয়ার্ড দিন");
    toast.success("স্বাগতম, অ্যাডমিন");
    navigate("/admin");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-glass rounded-2xl p-8 shadow-[var(--shadow-elegant)] animate-fade-in">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> দেয়ালে ফিরে যান
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">অ্যাডমিন লগইন</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          শুধু অনুমোদিত অ্যাডমিনরাই প্রবেশ করতে পারবেন।
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

        <p className="mt-4 text-xs text-muted-foreground text-center">
          নতুন অ্যাডমিন যোগ করতে বিদ্যমান অ্যাডমিনের অনুমতি প্রয়োজন।
        </p>
      </div>
    </main>
  );
}
