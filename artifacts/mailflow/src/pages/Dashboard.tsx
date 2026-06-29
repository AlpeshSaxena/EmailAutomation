import { useGetDashboardStats, useGetDashboardActivity, useGetDashboardChart } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Mail, CheckCircle, XCircle, Clock, FolderOpen, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();
  const { data: chartData } = useGetDashboardChart();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Email campaign overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Emails Sent", key: "totalSent", icon: CheckCircle, color: "text-green-600" },
          { label: "Failed", key: "totalFailed", icon: XCircle, color: "text-red-500" },
          { label: "Pending", key: "totalPending", icon: Clock, color: "text-yellow-500" },
          { label: "Campaigns", key: "totalCampaigns", icon: FolderOpen, color: "text-blue-500" },
          { label: "Templates", key: "totalTemplates", icon: FileText, color: "text-purple-500" },
        ].map(({ label, key, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats?.[key as keyof typeof stats] ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Email Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="sent" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Sent" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No email activity in the last 7 days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="divide-y divide-border max-h-[220px] overflow-auto">
                {activity.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.recipientEmail}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{log.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
