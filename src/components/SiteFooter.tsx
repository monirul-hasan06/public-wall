import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Users } from "lucide-react";

interface FooterSettings {
  footer_text: string;
  footer_show_credit: boolean;
  footer_show_community: boolean;
  footer_copyright_text: string;
}

type SiteSettingRow = {
  key: keyof FooterSettings;
  value: string | boolean | null;
};

const DEFAULTS: FooterSettings = {
  footer_text: "",
  footer_show_credit: true,
  footer_show_community: true,
  footer_copyright_text: "© {year} Deyal Likhon. All rights reserved.",
};

const BRAND_NAME = "TechCanvix";
const BRAND_URL = "https://www.facebook.com/share/17ji36osLq/";

export function SiteFooter({ extraTop }: { extraTop?: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FooterSettings>(DEFAULTS);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["footer_text", "footer_show_credit", "footer_show_community", "footer_copyright_text"])
      .then(({ data }) => {
        if (!data) return;
        const next = { ...DEFAULTS };
        for (const row of data as SiteSettingRow[]) {
          if (row.key === "footer_text") next.footer_text = String(row.value ?? "");
          else if (row.key === "footer_show_credit") next.footer_show_credit = Boolean(row.value);
          else if (row.key === "footer_show_community") next.footer_show_community = Boolean(row.value);
          else if (row.key === "footer_copyright_text")
            next.footer_copyright_text = String(row.value ?? DEFAULTS.footer_copyright_text);
        }
        setSettings(next);
      });
  }, []);

  const year = new Date().getFullYear();
  const copyright = settings.footer_copyright_text.replace(/\{year\}/g, String(year));

  return (
    <footer className="mt-16 text-center text-xs text-[hsl(48_30%_75%)]/70 space-y-3">
      {extraTop}

      {settings.footer_show_community && (
        <div>
          <a
            href={BRAND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-400 font-semibold underline-offset-4 hover:underline transition-colors"
          >
            <Users className="h-3.5 w-3.5" /> Join our community on Facebook
          </a>
        </div>
      )}

      {settings.footer_text.trim() && (
        <div className="whitespace-pre-line text-[hsl(48_30%_75%)]/80">{settings.footer_text}</div>
      )}

      {settings.footer_show_credit && (
        <div>
          Made by{" "}
          <a
            href={BRAND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-500 hover:text-green-400 font-semibold underline-offset-4 hover:underline"
          >
            {BRAND_NAME}
          </a>
        </div>
      )}

      <div className="text-[hsl(48_30%_75%)]/60">{copyright}</div>

      {!user && (
        <div>
          <Link
            to="/auth"
            className="inline-flex items-center text-[hsl(48_30%_75%)]/50 hover:text-[hsl(48_60%_92%)] transition-colors"
          >
            <LogIn className="mr-1 h-3 w-3" /> Admin Login
          </Link>
        </div>
      )}
    </footer>
  );
}
