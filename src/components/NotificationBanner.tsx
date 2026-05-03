import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

const DISMISS_KEY = "dismissed_notifications";

const getDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
};

export function NotificationBanner() {
  const [items, setItems] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());

  const fetchActive = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, message, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    fetchActive();
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchActive())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const visible = items.filter((n) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6 animate-fade-in">
      {visible.map((n) => (
        <div
          key={n.id}
          className="relative flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 backdrop-blur px-4 py-3 pr-10 shadow-lg"
        >
          <Megaphone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold mb-0.5">
              অ্যাডমিন ঘোষণা
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{n.message}</p>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            aria-label="বন্ধ করুন"
            className="absolute top-2 right-2 p-1 rounded hover:bg-foreground/10 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
