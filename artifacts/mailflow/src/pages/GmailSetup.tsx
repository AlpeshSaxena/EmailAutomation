import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, Settings } from "lucide-react";

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
    description:
      "In your project, navigate to APIs & Services > Library and enable the Gmail API.",
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
      "Go to APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID. Select Desktop App as the application type. Download the JSON file.",
    link: "https://console.cloud.google.com/apis/credentials",
    linkText: "Open Credentials",
  },
  {
    step: 5,
    title: "Get Your Refresh Token",
    description:
      "Use the OAuth 2.0 Playground or run the Google Auth Library to complete the OAuth flow and get a refresh token. You'll need to authorize the Gmail Send scope (https://www.googleapis.com/auth/gmail.send).",
    link: "https://developers.google.com/oauthplayground/",
    linkText: "Open OAuth Playground",
  },
  {
    step: 6,
    title: "Set Environment Variables",
    description:
      "In your Replit project, go to Secrets and set the following environment variables:",
    secrets: [
      { key: "GOOGLE_CLIENT_ID", desc: "From your OAuth 2.0 client credentials JSON" },
      { key: "GOOGLE_CLIENT_SECRET", desc: "From your OAuth 2.0 client credentials JSON" },
      { key: "GOOGLE_REFRESH_TOKEN", desc: "Obtained from OAuth flow in step 5" },
    ],
  },
];

const envVars = [
  { key: "GOOGLE_CLIENT_ID", label: "Client ID" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret" },
  { key: "GOOGLE_REFRESH_TOKEN", label: "Refresh Token" },
];

export default function GmailSetup() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gmail Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Gmail OAuth to send emails from your campaigns
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Environment Variables Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {envVars.map(({ key, label }) => {
            return (
              <div key={key} className="flex items-center justify-between py-1.5">
                <div>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{key}</code>
                  <span className="text-xs text-muted-foreground ml-2">{label}</span>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <XCircle className="w-3 h-3 mr-1 text-muted-foreground" />
                  Check Secrets panel
                </Badge>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">
            Environment variable values are server-side only and cannot be read by the frontend for security. Check your Replit Secrets panel to verify they are set.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Setup Instructions</h2>
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

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> For testing, you can use Google's OAuth Playground to generate tokens quickly. For production use, implement a proper OAuth flow and keep your credentials secure in Replit Secrets (never commit them to code).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
