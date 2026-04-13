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

interface SubscriptionRow {
  id: string;
  plan: string;
  status: string | null;
  credits: number | null;
  period_start: string | null;
  period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface SubsResponse {
  subscriptions: SubscriptionRow[];
  total: number;
  page: number;
  totalPages: number;
}

const PLAN_FILTERS = [
  { value: "", label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];

function PlanBadge({ plan }: { plan: string }) {
  const lower = plan.toLowerCase();
  if (lower === "free")
    return (
      <Badge variant="secondary" className="capitalize">
        Free
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 capitalize">
      {plan}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    status === "active"
      ? "bg-green-500/10 text-green-500 border-green-500/30"
      : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`capitalize text-[11px] ${color}`}>
      {status}
    </Badge>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState("");

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (plan) params.set("plan", plan);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, plan]);

  useEffect(() => {
    setPage(1);
  }, [plan]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compact Header Bar */}
      <div className="h-11 flex items-center px-4 bg-background/80 backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Subscriptions</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Toolbar Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <Filter className="size-3 text-muted-foreground" />
            <Select value={plan || "all"} onValueChange={(v) => setPlan(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_FILTERS.map((f) => (
                  <SelectItem key={f.value || "all"} value={f.value || "all"} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {data && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">
              {data.total.toLocaleString()} records
            </span>
          )}
        </div>

        <Card className="rounded-sm border-border/50 shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Plan</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Credits
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Period Start
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Period End
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Stripe ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <Skeleton className="h-4 w-full max-w-[100px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : data?.subscriptions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium truncate max-w-[160px]">
                                {sub.user_name || (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </p>
                              {sub.user_email && (
                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                  {sub.user_email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge plan={sub.plan} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {sub.credits?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(sub.period_start)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(sub.period_end)}
                          </td>
                          <td className="px-4 py-3">
                            {sub.stripe_subscription_id ? (
                              <code className="text-xs font-mono text-muted-foreground">
                                {sub.stripe_subscription_id.slice(0, 14)}…
                              </code>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {data.page} of {data.totalPages}
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
