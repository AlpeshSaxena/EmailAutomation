import { cn } from "@/lib/utils";

type Status = "draft" | "running" | "done" | "paused" | "pending" | "sent" | "failed";

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  running: { label: "Running", className: "bg-blue-100 text-blue-700" },
  done: { label: "Done", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
