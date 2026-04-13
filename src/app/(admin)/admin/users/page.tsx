"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Mail, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  email_verified: boolean;
  created_at: string;
  plan: string | null;
  credits: number | null;
  subscription_status: string | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
}

function planBadge(plan: string | null) {
  if (!plan) return <Badge variant="outline">—</Badge>;
  const lower = plan.toLowerCase();
  if (lower === "free")
    return (
      <Badge variant="secondary" className="capitalize">
        Free
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 capitalize">
      {plan}
    </Badge>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compact Header Bar */}
      <div className="h-11 flex items-center px-4 bg-background/80 backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Users</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Toolbar Row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/50 rounded-sm"
            />
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
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Plan</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Credits
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Verified
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Skeleton className="size-8 rounded-full" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-40" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-5 w-14" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-12" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-6" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        </tr>
                      ))
                    : data?.users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                <AvatarFallback className="text-xs">
                                  {(user.name || user.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate max-w-[160px]">
                                {user.name || <span className="text-muted-foreground">—</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{planBadge(user.plan)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {user.credits?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {user.email_verified ? (
                              <CheckCircle2 className="size-4 text-green-500" />
                            ) : (
                              <XCircle className="size-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(user.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
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
