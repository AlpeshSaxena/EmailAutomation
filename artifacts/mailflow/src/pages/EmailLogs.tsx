import { useState } from "react";
import { useListEmailLogs, useClearAllEmailLogs, useListCampaigns, type ListEmailLogsParams } from "@workspace/api-client-react";
import { getListEmailLogsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Search, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function EmailLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [clearOpen, setClearOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams: ListEmailLogsParams = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (campaignFilter !== "all") queryParams.campaignId = parseInt(campaignFilter);
  if (search) queryParams.search = search;

  const { data: logs, isLoading } = useListEmailLogs(queryParams);
  const { data: campaigns } = useListCampaigns();
  const clearLogs = useClearAllEmailLogs();

  const handleClear = async () => {
    try {
      await clearLogs.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getListEmailLogsQueryKey() });
      setClearOpen(false);
      toast({ title: "All email logs cleared" });
    } catch {
      toast({ title: "Failed to clear logs", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all sent emails</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => setClearOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Clear All Logs
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns?.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.recipientName ?? log.recipientEmail}</p>
                        {log.recipientName && (
                          <p className="text-xs text-muted-foreground">{log.recipientEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-64 truncate">{log.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.campaignName ?? `#${log.campaignId}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <StatusBadge status={log.status} />
                        {log.error && (
                          <p className="text-xs text-destructive max-w-40 truncate" title={log.error}>
                            {log.error}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No email logs found</p>
          </div>
        )}
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Email Logs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all email logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
