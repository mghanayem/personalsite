import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMOJI_LIST = [
  // People & communication
  "👤", "🧑‍💼", "🤝", "📞", "💬", "📧", "✉️",
  // Work & projects
  "💼", "📋", "📁", "🗂️", "📊", "📈", "🔧", "⚙️", "🛠️",
  // Content & media
  "📝", "✍️", "📖", "📚", "🖊️", "🗞️", "📰",
  // Navigation & home
  "🏠", "🏡", "🏢", "🌐", "🗺️", "📍", "🔗",
  // Awards & achievements
  "⭐", "🏆", "🥇", "🎯", "✅", "💡", "🔍",
  // Creative
  "🎨", "🖼️", "🎭", "🎬", "🎵", "🎤", "🖥️",
  // Nature & life
  "🌟", "🌙", "☀️", "🌿", "🌱", "🔥", "💎",
  // Social & community
  "👥", "🌍", "🤖", "🚀", "💻", "📱", "🔔",
  // Misc
  "ℹ️", "❓", "💡", "🎓", "📌", "🗓️", "⏰",
];

interface IconPickerProps {
  value: string | null | undefined;
  onChange: (icon: string | null) => void;
  /** Show as a small inline badge/button rather than a labelled button */
  compact?: boolean;
}

export function IconPicker({ value, onChange, compact = false }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? EMOJI_LIST.filter((e) => e.includes(search.trim()))
    : EMOJI_LIST;

  const handleSelect = (emoji: string) => {
    onChange(emoji === value ? null : emoji);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            type="button"
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md border text-base transition-colors shrink-0",
              value
                ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary",
            )}
            title={value ? "Change icon" : "Add icon"}
          >
            {value ?? <span className="text-xs">+</span>}
          </button>
        ) : (
          <Button type="button" variant="outline" className="gap-2 min-w-[120px] justify-start">
            {value ? (
              <>
                <span className="text-lg">{value}</span>
                <span className="text-muted-foreground text-xs">Change icon</span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Choose icon…</span>
            )}
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 px-2 text-xs text-muted-foreground shrink-0"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto">
            {filtered.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded text-lg hover:bg-muted transition-colors",
                  emoji === value && "bg-primary/10 ring-1 ring-primary/40",
                )}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-8 text-center text-sm text-muted-foreground py-4">
                No match
              </p>
            )}
          </div>

          {value && (
            <div className="flex items-center gap-2 pt-1 border-t text-sm text-muted-foreground">
              <span>Selected:</span>
              <span className="text-xl">{value}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
