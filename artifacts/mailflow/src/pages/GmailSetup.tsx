import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Settings,
  RefreshCw,
  Send,
  Wifi,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

interface GmailStatus {
  configured: boolean;
  email: string | null;
  error: string | null;
}

interface TestResult {
  ok: boolean;
  sentTo: string;
}

const steps = [
  {
    step: 1,
    title: "Create a Google Cloud Project",
    description: "Go to the Google Cloud Console and create a new project (or use an existing one).",
    link: "https://console.cloud.google.com/",
    linkText: "Open Google Cloud Console",
  },
  {
    step: 2,
    title: "Enable the Gmail API",
    description: "In your project, navigate to APIs & Services > Library and enable the Gmail API.",
    link: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
    linkText: "Enable Gmail API",
  },
  {
    step: 3,
    title: "Configure OAuth Consent Screen",
    description:
      "Go to APIs & Services > OAuth consent screen. Set it to External and add your Gmail address as a test user.",
  },
  {
    step: 4,
    title: "Create OAuth 2.0 Credentials",
    description:
      "Go to APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID. Select Desktop App as the application type.",
    link: "https://console.cloud.google.com/apis/credentials",
    linkText: "Open Credentials",
  },
  {
    step: 5,
    title: "Get Your Refresh Token",
    description:
      "Use the OAuth 2.0 Playground to complete the OAuth flow and get a refresh token with the Gmail Send scope (https://www.googleapis.com/auth/gmail.send).",
    link: "https://developers.google.com/oauthplayground/",
    linkText: "Open OAuth Playground",
  },
  {
    step: 6,
    title: "Set Environment Variables",
    description: "In your Replit project, go to Secrets and set the following environment variables:",
    secrets: [
      { key: "GOOGLE_CLIENT_ID", desc: "From your OAuth 2.0 client credentials JSON" },
      { key: "GOOGLE_CLIENT_SECRET", desc: "From your OAuth 2.0 client credentials JSON" },
      { key: "GOOGLE_REFRESH_TOKEN", desc: "Obtained from OAuth flow in step 5" },
    ],
  },
];

export default function GmailSetup() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: status, isLoading, refetch, isFetching } = useQuery<GmailStatus>({
    queryKey: ["gmail-status"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/status");
      if (!res.ok) throw new Error("Failed to check status");
      return res.json() as Promise<GmailStatus>;
    },
    retry: false,
  });

  const testMutation = useMutation<TestResult, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/gmail/send-test", { method: "POST" });
      const data = await res.json() as TestResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      return data;
    },
    onSuccess: (data) => {
      setTestResult(`Test email sent to ${data.sentTo}`);
      toast({ title: "Test email sent!", description: `Check your inbox at ${data.sentTo}` });
    },
    onError: (err) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const isConnected = status?.configured && !status?.error;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gmail Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Gmail OAuth to send emails from your campaigns
        </p>
      </div>

      {/* Live connection status */}
      <Card className={isConnected ? "border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Gmail connected
                      </span>
                    </div>
                    {status?.email && (
                      <p className="text-xs text-muted-foreground ml-6">Sending as: <strong>{status.email}</strong></p>
                    )}
                    {testResult && (
                      <p className="text-xs text-green-600 ml-6">{testResult}</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      {status?.error ?? "Not configured"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                {isConnected && (
                  <Button
                    size="sm"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                    className="h-8 text-xs"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {testMutation.isPending ? "Sending…" : "Send Test Email"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Env var checklist */}
          <div className="pt-2 border-t border-border space-y-1.5">
            {[
              { key: "GOOGLE_CLIENT_ID", label: "Client ID" },
              { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret" },
              { key: "GOOGLE_REFRESH_TOKEN", label: "Refresh Token" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{key}</code>
                  <span className="text-xs text-muted-foreground ml-2">{label}</span>
                </div>
                {isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : status?.configured ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" /> Set
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <XCircle className="w-3 h-3 mr-1" /> Missing
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup steps */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Setup Instructions
        </h2>
        {steps.map(({ step, title, description, link, linkText, secrets }) => (
          <Card key={step}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{description}</p>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {linkText}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {secrets && (
                    <div className="mt-2 space-y-1.5">
                      {secrets.map(s => (
                        <div key={s.key} className="bg-muted rounded p-2">
                          <code className="text-xs font-bold">{s.key}</code>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> For testing, you can use Google's OAuth Playground to generate tokens quickly. For production use, implement a proper OAuth flow and keep your credentials secure in Replit Secrets — never commit them to code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
