"use client";

import { useState, useEffect, type ReactNode } from "react";
import { CornerUpLeft, Copy, SmilePlus, Info, CornerUpRight, Pin, Sparkles, Star, CheckSquare, Download, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Message } from "@/types";

// WhatsApp's own quick-reaction bar starts with these six. Picking the same
// set keeps the affordance familiar without pulling in a 300KB emoji library.
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageActionsProps {
  message: Message;
  onReply: () => void;
  onReact: (emoji: string) => void;
  children: ReactNode;
}

/**
 * Hover/long-press toolbar wrapper around a `<MessageBubble>`. The bubble
 * itself stays a pure presenter — this component owns the action surface so
 * the bubble's render path is unaffected when the toolbar isn't visible.
 */
export function MessageActions({
  message,
  onReply,
  onReact,
  children,
}: MessageActionsProps) {
  // Touch devices have no hover. Long-press fires `contextmenu`; we capture
  // it to open our custom Context Menu instead of the native one.
  const [touchOpen, setTouchOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, { capture: true });
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, { capture: true });
      window.removeEventListener("resize", closeMenu);
    };
  }, [contextMenu]);

  const isAgent =
    message.sender_type === "agent" || message.sender_type === "bot";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Calculate position, ensuring the menu doesn't flow off-screen
    let x = e.clientX;
    let y = e.clientY;
    
    // Rough estimate of menu dimensions to prevent overflow
    const menuWidth = 200;
    const menuHeight = 400;
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({ x, y });
    setTouchOpen(true);
  };

  const handleCopy = async () => {
    const text = message.content_text ?? "";
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    setTouchOpen(false);
  };

  const handlePickEmoji = (emoji: string) => {
    onReact(emoji);
    setPickerOpen(false);
    setTouchOpen(false);
    setContextMenu(null);
  };

  const handleReply = () => {
    onReply();
    setTouchOpen(false);
    setContextMenu(null);
  };

  const handleComingSoon = (action: string) => {
    toast.info(`${action} is coming soon!`);
    setContextMenu(null);
  };

  // Row alignment lives here (not in MessageBubble) so the `group/actions`
  // hover region matches the bubble's content width — hovering empty space
  // in the row no longer reveals the toolbar.
  return (
    <div
      className={cn(
        "flex w-full",
        isAgent ? "justify-end" : "justify-start",
      )}
      onContextMenu={handleContextMenu}
      onBlur={() => setTouchOpen(false)}
    >
      <div className="group/actions relative max-w-[75%]">
        {children}
      <div
        data-touch-open={touchOpen || pickerOpen ? "true" : undefined}
        className={cn(
          "absolute -top-3 z-10 flex h-7 items-center gap-0.5 rounded-full border border-border bg-background/95 px-1 shadow-md backdrop-blur-sm transition-opacity",
          "opacity-0 group-hover/actions:opacity-100 group-focus-within/actions:opacity-100",
          "data-[touch-open=true]:opacity-100",
          isAgent ? "right-3" : "left-3",
        )}
      >
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            className="flex h-5 w-5 items-center justify-center rounded-full text-foreground hover:bg-muted hover:text-foreground"
            aria-label="React"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent
            className="flex w-auto flex-row gap-1 p-1.5"
            sideOffset={6}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => handlePickEmoji(e)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-125 hover:bg-muted"
                aria-label={`React with ${e}`}
              >
                {e}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={handleReply}
          className="flex h-5 w-5 items-center justify-center rounded-full text-foreground hover:bg-muted hover:text-foreground"
          aria-label="Reply"
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-5 w-5 items-center justify-center rounded-full text-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      </div>

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // prevent immediate close on inner clicks
        >
          <div className="flex flex-col text-sm text-popover-foreground">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Message info")}
            >
              <Info className="h-4 w-4" /> Message info
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={handleReply}
            >
              <CornerUpLeft className="h-4 w-4" /> Reply
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Forwarding")}
            >
              <CornerUpRight className="h-4 w-4" /> Forward
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Pinning")}
            >
              <Pin className="h-4 w-4" /> Pin
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Starring")}
            >
              <Star className="h-4 w-4" /> Star
            </button>
            
            <div className="my-1 h-px bg-border" />
            
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Selecting messages")}
            >
              <CheckSquare className="h-4 w-4" /> Select
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Save as")}
            >
              <Download className="h-4 w-4" /> Save as
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Sharing")}
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleComingSoon("Open with")}
            >
              <ExternalLink className="h-4 w-4" /> Open with
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
