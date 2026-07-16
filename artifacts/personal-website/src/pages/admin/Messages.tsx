import { useState } from "react";
import {
  useListMessages,
  useListArchivedMessages,
  useMarkMessageRead,
  useArchiveMessage,
  useUnarchiveMessage,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MailOpen,
  Archive,
  ArchiveRestore,
  Loader2,
  Inbox,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMessagesQueryKey,
  getListArchivedMessagesQueryKey,
} from "@workspace/api-client-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MessageCardProps {
  msg: {
    id: number;
    name: string;
    email: string;
    message: string;
    isRead: boolean;
    isArchived: boolean;
    receivedAt: string;
  };
  isArchived?: boolean;
}

function MessageCard({ msg, isArchived = false }: MessageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const markRead = useMarkMessageRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
      },
    },
  });

  const archive = useArchiveMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListArchivedMessagesQueryKey() });
      },
    },
  });

  const unarchive = useUnarchiveMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListArchivedMessagesQueryKey() });
      },
    },
  });

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (!msg.isRead && !isArchived) {
      markRead.mutate({ id: msg.id });
    }
  };

  return (
    <Card
      className={`transition-colors ${!msg.isRead && !isArchived ? "border-primary/40 bg-primary/5" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={handleExpand}
            className="flex-1 text-left space-y-0.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {!msg.isRead && !isArchived ? (
                <Mail className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <MailOpen className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <CardTitle className="text-base font-semibold">{msg.name}</CardTitle>
              {!msg.isRead && !isArchived && (
                <Badge variant="default" className="text-xs">New</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{msg.email}</p>
            <p className="text-xs text-muted-foreground">{formatDate(msg.receivedAt)}</p>
          </button>

          <div className="flex gap-1 shrink-0">
            {!isArchived ? (
              <Button
                variant="ghost"
                size="icon"
                title="Archive"
                disabled={archive.isPending}
                onClick={() => archive.mutate({ id: msg.id })}
              >
                {archive.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Restore"
                disabled={unarchive.isPending}
                onClick={() => unarchive.mutate({ id: msg.id })}
              >
                {unarchive.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArchiveRestore className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-3 mt-1">
            <p className="text-sm whitespace-pre-wrap text-foreground">{msg.message}</p>
            <a
              href={`mailto:${msg.email}`}
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Reply to {msg.email}
            </a>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function Messages() {
  const { data: inbox, isLoading: loadingInbox } = useListMessages();
  const { data: archived, isLoading: loadingArchived } = useListArchivedMessages();

  const unreadCount = inbox?.filter((m) => !m.isRead).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Contact form submissions from visitors.
          </p>
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              Inbox
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-4 space-y-3">
            {loadingInbox ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : inbox && inbox.length > 0 ? (
              inbox.map((msg) => <MessageCard key={msg.id} msg={msg} />)
            ) : (
              <EmptyState text="No messages yet." />
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-4 space-y-3">
            {loadingArchived ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : archived && archived.length > 0 ? (
              archived.map((msg) => (
                <MessageCard key={msg.id} msg={msg} isArchived />
              ))
            ) : (
              <EmptyState text="No archived messages." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
