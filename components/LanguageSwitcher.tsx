"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { setLocale } from "@/app/actions/locale";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "nl", label: "Nederlands" },
];

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(code: string) {
    setOpen(false);
    if (code === currentLocale) return;
    startTransition(async () => {
      await setLocale(code);
      router.refresh();
    });
  }

  const current = LOCALES.find((l) => l.code === currentLocale);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg transition-colors ${
          isPending
            ? "opacity-50 pointer-events-none"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase text-xs font-medium tracking-wide">
          {current?.code ?? currentLocale}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <span className={code === currentLocale ? "font-medium text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
              {code === currentLocale && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
