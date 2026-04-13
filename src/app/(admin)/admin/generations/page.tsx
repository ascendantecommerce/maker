"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface GenerationRow {
  id: string;
  status: string;
  progress: number | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface GenerationsResponse {
  generations: GenerationRow[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500/10 text-green-500 border-green-500/30",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/30",
  PENDING: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  CANCELED: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`capitalize text-[11px] ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.toLowerCase()}
    </Badge>
  );
}

const ALL_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROGRESS", label: "In Progress" },
  { value: "CANCELED", label: "Canceled" },
];

export default function AdminGenerationsPage() {
  const [data, setData] = useState<GenerationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/generations?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compact Header Bar */}
      <div className="h-11 flex items-center px-4 bg-background/80 backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Generations</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Toolbar Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <Filter className="size-3 text-muted-foreground" />
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s.value || "all"} value={s.value || "all"} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {data && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">
              {data.total.toLocaleString()} total
            </span>
          )}
        </div>

        <Card className="rounded-sm border-border/50 shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">ID</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 w-40">
                      Progress
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Created
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <Skeleton className="h-4 w-full max-w-[120px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : data?.generations.map((gen) => (
                        <tr
                          key={gen.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {gen.id.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium truncate max-w-[180px]">
                                {gen.user_name || (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </p>
                              {gen.user_email && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {gen.user_email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={gen.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={gen.progress ?? 0}
                                className="h-1.5 flex-1 max-w-[80px]"
                              />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {Math.round(gen.progress ?? 0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(gen.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(gen.updated_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {data.page} of {data.totalPages} ({data.total.toLocaleString()} total)
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
