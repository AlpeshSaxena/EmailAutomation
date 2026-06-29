import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import CampaignList from "@/pages/campaigns/CampaignList";
import CampaignDetail from "@/pages/campaigns/CampaignDetail";
import TemplateList from "@/pages/templates/TemplateList";
import TemplateEditor from "@/pages/templates/TemplateEditor";
import EmailLogs from "@/pages/EmailLogs";
import GmailSetup from "@/pages/GmailSetup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/campaigns" component={CampaignList} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/templates" component={TemplateList} />
        <Route path="/templates/new" component={TemplateEditor} />
        <Route path="/templates/:id/edit" component={TemplateEditor} />
        <Route path="/email-logs" component={EmailLogs} />
        <Route path="/gmail-setup" component={GmailSetup} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
