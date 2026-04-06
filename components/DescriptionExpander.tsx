"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  html?: string | null;
  text?: string | null;
  /** Number of lines to clamp before showing "see more". Default: 5 */
  clampLines?: number;
};

export default function DescriptionExpander({ html, text, clampLines = 5 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpander, setNeedsExpander] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Check if content overflows the clamped height
    const isTruncated = el.scrollHeight > el.clientHeight + 2;
    setNeedsExpander(isTruncated);
  }, [html, text]);

  const isHtml = !!html?.startsWith("<");

  return (
    <div className="space-y-1">
      {/* Description container */}
      <div
        className={[
          "relative rounded-2xl border border-border bg-muted/30 px-5 py-4 transition-all duration-300",
          !expanded && needsExpander ? "overflow-hidden" : "",
        ].join(" ")}
        style={
          !expanded && needsExpander
            ? { maxHeight: `${clampLines * 1.75}rem` }
            : undefined
        }
      >
        <div ref={contentRef}>
          {isHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html! }}
            />
          ) : (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
              {text}
            </p>
          )}
        </div>

        {/* Fade-out gradient when collapsed */}
        {!expanded && needsExpander && (
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-muted/60 to-transparent pointer-events-none rounded-b-2xl" />
        )}
      </div>

      {/* Toggle button — only shown when content is actually long */}
      {needsExpander && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition px-1 pt-1"
        >
          {expanded ? (
            <>
              Show less
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
