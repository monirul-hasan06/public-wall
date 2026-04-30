import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Share2, Facebook, Twitter, MessageCircle, Send, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  title?: string;
  label?: string;
}

export function ShareWallButton({ url, title = "আমার দেয়াল দেখুন", label = "শেয়ার করুন" }: Props) {
  const [open, setOpen] = useState(false);
  const text = `${title} — ${url}`;
  const enc = encodeURIComponent;

  const tryNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        setOpen(false);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = await tryNative();
    if (!ok) setOpen(true);
  };

  const links: { name: string; href: string; icon: React.ReactNode }[] = [
    { name: "Facebook", icon: <Facebook className="h-4 w-4" />, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, href: `https://wa.me/?text=${enc(text)}` },
    { name: "Messenger", icon: <Send className="h-4 w-4" />, href: `https://www.facebook.com/dialog/send?link=${enc(url)}&app_id=140586622674265&redirect_uri=${enc(url)}` },
    { name: "Twitter / X", icon: <Twitter className="h-4 w-4" />, href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { name: "Telegram", icon: <Send className="h-4 w-4" />, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}` },
    { name: "Email", icon: <Mail className="h-4 w-4" />, href: `mailto:?subject=${enc(title)}&body=${enc(text)}` },
  ];

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("লিংক কপি হয়েছে");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" onClick={handleClick}>
          <Share2 className="mr-1.5 h-4 w-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="grid grid-cols-1 gap-1">
          {links.map(l => (
            <a
              key={l.name}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.icon} {l.name}
            </a>
          ))}
          <button
            onClick={copy}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Link2 className="h-4 w-4" /> লিংক কপি
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
