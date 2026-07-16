import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListMessages,
  useMarkMessageRead,
  useDeleteMessage,
  getListMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, Mail, MailOpen, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Messages() {
  const queryClient = useQueryClient();
  const { data: messages, isLoading, isError } = useListMessages();
  const markRead = useMarkMessageRead();
  const deleteMsg = useDeleteMessage();

  const [expanded, setExpanded] = useState<number | null>(null);

  const unreadCount = messages?.filter((m) => !m.isRead).length ?? 0;

  function handleExpand(id: number) {
    setExpanded((prev) => (prev === id ? null : id));
    // Mark as read when opened (fire-and-forget)
    const msg = messages?.find((m) => m.id === id);
    if (msg && !msg.isRead) {
      markRead.mutate(
        { id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() }) }
      );
    }
  }

  function handleDelete(id: number) {
    deleteMsg.mutate(
      { id },
      {
        onSuccess: () => {
          if (expanded === id) setExpanded(null);
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        },
      }
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Contact form submissions from your visitors
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading messages…</span>
          </div>
        )}

        {isError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
            Failed to load messages. Please refresh the page.
          </div>
        )}

        {!isLoading && !isError && messages?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <Inbox className="w-10 h-10 opacity-40" />
            <p className="text-sm">No messages yet. When visitors fill out the contact form, they'll appear here.</p>
          </div>
        )}

        {!isLoading && !isError && messages && messages.length > 0 && (
          <div className="rounded-lg border bg-card divide-y divide-border overflow-hidden">
            {messages.map((msg) => {
              const isOpen = expanded === msg.id;
              const date = new Date(msg.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={msg.id} className={`transition-colors ${!msg.isRead ? "bg-primary/5" : ""}`}>
                  <button
                    className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                    onClick={() => handleExpand(msg.id)}
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {msg.isRead ? (
                        <MailOpen className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4 text-primary" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium truncate ${!msg.isRead ? "text-foreground" : "text-foreground/80"}`}>
                          {msg.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{date}</span>
                        {!msg.isRead && (
                          <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.email}</p>
                      {!isOpen && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{msg.message}</p>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="rounded-md bg-muted/60 p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border/50">
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`mailto:${msg.email}?subject=Re: your message`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Reply to {msg.email}
                        </a>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                          onClick={() => handleDelete(msg.id)}
                          disabled={deleteMsg.isPending}
                        >
                          {deleteMsg.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
