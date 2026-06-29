import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCampaign,
  useListRecipients,
  useAddRecipients,
  useSendCampaign,
  useRetryCampaign,
  useSendTestEmail,
  useGetCampaignStats,
  useListTemplates,
  useUpdateCampaign,
} from "@workspace/api-client-react";
import {
  getGetCampaignQueryKey,
  getListRecipientsQueryKey,
  getGetCampaignStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  Send,
  RefreshCw,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  FlaskConical,
  Edit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

interface RouteParams {
  id: string;
}

export default function CampaignDetail() {
  const params = useParams<RouteParams>();
  const id = parseInt(params.id, 10);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editTemplateId, setEditTemplateId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaign, isLoading } = useGetCampaign(id);
  const { data: recipients } = useListRecipients(id);
  const { data: stats } = useGetCampaignStats(id);
  const { data: templates } = useListTemplates();
  const addRecipients = useAddRecipients();
  const sendCampaign = useSendCampaign();
  const retryCampaign = useRetryCampaign();
  const sendTestEmail = useSendTestEmail();
  const updateCampaign = useUpdateCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListRecipientsQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetCampaignStatsQueryKey(id) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map(row => ({
          name: row["name"] ?? row["Name"] ?? "",
          email: row["email"] ?? row["Email"] ?? "",
          role: row["role"] ?? row["Role"] ?? undefined,
          domain: row["domain"] ?? row["Domain"] ?? undefined,
          organization: row["organization"] ?? row["Organization"] ?? row["company"] ?? undefined,
          metadata: undefined,
        })).filter(r => r.email && r.name);

        if (rows.length === 0) {
          toast({ title: "No valid rows found in CSV", variant: "destructive" });
          return;
        }
        try {
          await addRecipients.mutateAsync({ id, data: { recipients: rows } });
          invalidate();
          setUploadOpen(false);
          toast({ title: `Added ${rows.length} recipients` });
        } catch {
          toast({ title: "Failed to upload recipients", variant: "destructive" });
        }
      },
    });
  };

  const handleSend = async () => {
    try {
      const result = await sendCampaign.mutateAsync({ id });
      toast({ title: result.message });
      setTimeout(invalidate, 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleRetry = async () => {
    try {
      const result = await retryCampaign.mutateAsync({ id });
      toast({ title: result.message });
      setTimeout(invalidate, 1500);
    } catch {
      toast({ title: "Failed to retry", variant: "destructive" });
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    try {
      await sendTestEmail.mutateAsync({ id, data: { to: testEmail } });
      toast({ title: `Test email sent to ${testEmail}` });
      setTestOpen(false);
      setTestEmail("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send test email";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    try {
      await updateCampaign.mutateAsync({
        id,
        data: {
          name: editName,
          templateId: editTemplateId && editTemplateId !== "none" ? parseInt(editTemplateId) : null,
        },
      });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["listCampaigns"] });
      setEditOpen(false);
      toast({ title: "Campaign updated" });
    } catch {
      toast({ title: "Failed to update campaign", variant: "destructive" });
    }
  };

  const openEdit = () => {
    setEditName(campaign?.name ?? "");
    setEditTemplateId(campaign?.templateId ? String(campaign.templateId) : "none");
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center text-muted-foreground">Campaign not found</div>
    );
  }

  const total = stats?.total ?? 0;
  const sent = stats?.sent ?? 0;
  const failed = stats?.failed ?? 0;
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
            Test Email
          </Button>
          {failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryCampaign.isPending}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Failed
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sendCampaign.isPending || total === 0}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {sendCampaign.isPending ? "Sending..." : "Send Campaign"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: total, icon: Mail, color: "text-blue-500" },
          { label: "Sent", value: sent, icon: CheckCircle, color: "text-green-600" },
          { label: "Failed", value: failed, icon: XCircle, color: "text-red-500" },
          { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Recipients ({recipients?.length ?? 0})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recipients && recipients.length > 0 ? (
            <div className="overflow-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.organization ?? r.domain ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No recipients yet. Import a CSV file to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Recipients from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Your CSV should have columns: <code className="bg-muted px-1 rounded">name</code>,{" "}
              <code className="bg-muted px-1 rounded">email</code>, and optionally{" "}
              <code className="bg-muted px-1 rounded">role</code>,{" "}
              <code className="bg-muted px-1 rounded">organization</code>,{" "}
              <code className="bg-muted px-1 rounded">domain</code>.
            </p>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose CSV File
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Send to</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={handleTestEmail} disabled={!testEmail || sendTestEmail.isPending}>
              {sendTestEmail.isPending ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={editTemplateId} onValueChange={setEditTemplateId}>
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || updateCampaign.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
