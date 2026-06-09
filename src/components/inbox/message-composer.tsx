"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { Send, LayoutTemplate, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplyQuote } from "./reply-quote";

interface ReplyDraft {
  /** Internal UUID of the message being replied to — sent back through onSend. */
  id: string;
  authorLabel: string;
  preview: string;
}

interface MessageComposerProps {
  conversationId: string;
  sessionExpired: boolean;
  onSend: (text: string, replyToId?: string) => void;
  onSendMedia?: (file: File, type: "image" | "document" | "video" | "audio", caption?: string, replyToId?: string) => void;
  onOpenTemplates: () => void;
  replyTo?: ReplyDraft | null;
  onClearReply?: () => void;
}

export function MessageComposer({
  conversationId,
  sessionExpired,
  onSend,
  onSendMedia,
  onOpenTemplates,
  replyTo,
  onClearReply,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop recording and return Blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(audioBlob);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    });
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Microphone is not supported in this browser. You must be on HTTPS or localhost.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(200); // 200ms chunks
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        toast.error("Microphone access denied. Please check your browser's site settings and ensure permissions are allowed.");
      } else {
        toast.error(`Microphone error: ${errorMessage}`);
      }
    }
  }, []);

  const handleCancelRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await stopRecording();
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [stopRecording]);

  const handleSendRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const blob = await stopRecording();
    setIsRecording(false);
    setRecordingTime(0);
    
    if (blob && onSendMedia && blob.size > 0) {
      setSending(true);
      try {
        const file = new File([blob], "voice-note.webm", { type: "audio/webm" });
        onSendMedia(file, "audio", undefined, replyTo?.id);
      } finally {
        setSending(false);
      }
    }
  }, [stopRecording, onSendMedia, replyTo?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Max 4 lines (~96px)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedFile) || sending || sessionExpired) return;

    setSending(true);
    try {
      if (selectedFile && onSendMedia) {
        // Determine type based on mime
        const mime = selectedFile.type;
        let type: "image" | "document" | "video" | "audio" = "document";
        if (mime.startsWith("image/")) type = "image";
        else if (mime.startsWith("video/")) type = "video";
        else if (mime.startsWith("audio/")) type = "audio";

        onSendMedia(selectedFile, type, trimmed || undefined, replyTo?.id);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        onSend(trimmed, replyTo?.id);
      }
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionExpired, onSend, onSendMedia, replyTo?.id, selectedFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      alert("File size must be under 16MB.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    // Clear the input so selecting the same file again triggers change event
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      adjustHeight();
    },
    [adjustHeight]
  );

  return (
    <div className="border-t border-border bg-background p-3">
      {replyTo && (
        <div className="mb-2">
          <ReplyQuote
            authorLabel={replyTo.authorLabel}
            preview={replyTo.preview}
            onDismiss={onClearReply}
          />
        </div>
      )}
      {sessionExpired && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">
            24-hour session expired. Use a template to re-engage.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-400 hover:text-amber-300"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="mr-1 h-3 w-3" />
            Templates
          </Button>
        </div>
      )}

      {selectedFile && (
        <div className="mb-2 relative inline-flex items-start rounded-lg border border-border bg-muted/50 p-2">
          <button
            type="button"
            className="absolute -right-2 -top-2 rounded-full bg-background p-0.5 text-muted-foreground hover:text-foreground border border-border"
            onClick={handleClearFile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          {previewUrl && selectedFile.type.startsWith("image/") ? (
            <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-md object-cover" />
          ) : previewUrl && selectedFile.type.startsWith("video/") ? (
            <video src={previewUrl} className="h-16 w-16 rounded-md object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          )}
          <div className="ml-3 flex flex-col justify-center truncate max-w-[200px]">
            <span className="text-xs font-medium text-foreground truncate">{selectedFile.name}</span>
            <span className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          disabled={sessionExpired || isRecording}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          onClick={onOpenTemplates}
          title="Send template"
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>

        {isRecording ? (
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-1.5 h-[38px]">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 font-mono text-sm font-medium text-red-500">
              {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, "0")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleCancelRecording}
              title="Cancel recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              sessionExpired
                ? "Session expired - use a template"
                : "Type a message... (Shift+Enter for new line)"
            }
            disabled={sessionExpired}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50",
              sessionExpired && "cursor-not-allowed opacity-50"
            )}
          />
        )}

        {text.trim() || selectedFile ? (
          <Button
            size="sm"
            className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90 disabled:opacity-40"
            disabled={(!text.trim() && !selectedFile) || sessionExpired || sending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : isRecording ? (
          <Button
            size="sm"
            className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90 disabled:opacity-40"
            disabled={sending}
            onClick={handleSendRecording}
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={sessionExpired}
            onClick={handleStartRecording}
            title="Record voice note"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {!isRecording && (
        <p className="mt-1 pl-11 text-[10px] text-muted-foreground">
          Type &apos;/&apos; for quick replies
        </p>
      )}
    </div>
  );
}
