import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, Home, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function FloatingControls({ showHome = false }: { showHome?: boolean }) {
  const { theme, toggle } = useTheme();
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
      toast.success("অ্যাপ ইনস্টল হয়েছে");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installEvt) {
      await installEvt.prompt();
      const r = await installEvt.userChoice;
      if (r.outcome !== "accepted") toast.message("ইনস্টল বাতিল হয়েছে");
      setInstallEvt(null);
    } else {
      toast.message("ব্রাউজার মেনু থেকে 'Add to Home Screen' বেছে নিন");
    }
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  return (
    <>
      {/* Top-right cluster */}
      <div className="fixed top-3 right-3 z-50 flex flex-col gap-2">
        <button onClick={toggle} aria-label="দিন/রাত মোড" className="fab">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {showHome && (
          <Link to="/" aria-label="হোম" className="fab">
            <Home className="h-4 w-4" />
          </Link>
        )}
        {!installed && (
          <button onClick={handleInstall} aria-label="অ্যাপ ইনস্টল করুন" className="fab" title="ইনস্টল করুন">
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Right-side scroll cluster */}
      <div className="fixed bottom-4 right-3 z-50 flex flex-col gap-2">
        <button onClick={scrollTop} aria-label="উপরে যান" className="fab">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button onClick={scrollBottom} aria-label="নিচে যান" className="fab">
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
