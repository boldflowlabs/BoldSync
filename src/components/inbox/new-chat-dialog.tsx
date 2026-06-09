"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquarePlus, Loader2 } from "lucide-react";
import type { Contact, Conversation } from "@/types";
import { cn } from "@/lib/utils";

interface NewChatDialogProps {
  onConversationCreated: (conversation: Conversation) => void;
}

export function NewChatDialog({ onConversationCreated }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const fetchContacts = useCallback(async (searchQuery: string) => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (searchQuery.trim()) {
      const term = `%${searchQuery.trim()}%`;
      query = query.or(`name.ilike.${term},phone.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load contacts");
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchContacts(search);
    }
  }, [open, search, fetchContacts]);

  const handleStartChat = async (contact: Contact) => {
    setStartingChat(contact.id);
    const supabase = createClient();
    
    // First, check if there is an existing conversation for this contact
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*)")
      .eq("contact_id", contact.id)
      .maybeSingle();

    if (existingConv) {
      setStartingChat(null);
      setOpen(false);
      onConversationCreated(existingConv as Conversation);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setStartingChat(null);
      return;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        contact_id: contact.id,
        status: "open",
        unread_count: 0,
      })
      .select("*, contact:contacts(*)")
      .single();

    setStartingChat(null);

    if (error) {
      toast.error("Failed to start conversation");
      console.error(error);
    } else if (newConv) {
      setOpen(false);
      onConversationCreated(newConv as Conversation);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />
        }
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="sr-only">New Chat</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] mt-2 rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "No contacts found matching search." : "No contacts available."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-1">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartChat(contact)}
                  disabled={startingChat === contact.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none",
                    startingChat === contact.id && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (contact.name || contact.phone || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">
                      {contact.name || <span className="italic text-muted-foreground">Unnamed</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                  {startingChat === contact.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
