"use client";

import React, { memo } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AvatarNodeData = {
  avatar?: { id: string; name: string; url: string };
};

export type AvatarNode = Node<AvatarNodeData, "avatar">;

function AvatarNode({ id, data, selected }: NodeProps<AvatarNode>) {
  const avatar = data.avatar;

  return (
    <Card 
      className={cn(
        "w-[300px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected ? "border-primary ring-4 ring-primary/10" : "border-border/40 bg-card"
      )}
    >
      <CardHeader className="m-0 bg-muted/30 px-4 py-3 border-b border-border/50 flex flex-row items-center gap-2">
        <User className="w-4 h-4 text-blue-400" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Digital Avatar
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {avatar ? (
          <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-border bg-muted/50 group/img shadow-sm">
            <img
              src={avatar.url}
              alt={avatar.name}
              className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/50">
              <p className="text-[10px] font-black text-foreground truncate text-center uppercase tracking-tighter">
                {avatar.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border/50 shadow-inner">
              <User className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              No Avatar Selected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(AvatarNode);
