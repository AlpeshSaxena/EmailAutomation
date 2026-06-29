import { useState } from "react";
import { Link } from "wouter";
import {
  useListCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useListTemplates,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, ArrowRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function CampaignList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");

  const { data: campaigns, isLoading } = useListCampaigns();
  const { data: templates } = useListTemplates();
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createCampaign.mutateAsync({
        data: {
          name: name.trim(),
          templateId: templateId && templateId !== "none" ? parseInt(templateId) : null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      setCreateOpen(false);
      setName("");
      setTemplateId("");
      toast({ title: "Campaign created" });
    } catch {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCampaign.mutateAsync({ id: deleteId });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      setDeleteId(null);
      toast({ title: "Campaign deleted" });
    } catch {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your email campaigns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campaign.totalCount} recipients
                      </span>
                      <span className="text-green-600 font-medium">{campaign.sentCount} sent</span>
                      {campaign.failedCount > 0 && (
                        <span className="text-red-500 font-medium">{campaign.failedCount} failed</span>
                      )}
                      {campaign.pendingCount > 0 && (
                        <span className="text-yellow-600 font-medium">{campaign.pendingCount} pending</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="outline" size="sm">
                        Open <ArrowRight className="w-3 h-3 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No campaigns yet. Create your first one!</p>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g. Q1 Outreach"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template (optional)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createCampaign.isPending}>
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign, all its recipients, and email logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Mail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8l10 6 10-6" />
    </svg>
  );
}
