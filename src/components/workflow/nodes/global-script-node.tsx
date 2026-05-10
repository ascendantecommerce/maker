"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type GlobalScriptNodeData = {
  label?: string;
  text?: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type GlobalScriptNode = Node<GlobalScriptNodeData, "globalScript">;

function GlobalScriptNode({ id, data, selected }: NodeProps<GlobalScriptNode>) {
  return (
    <Card 
      className={cn(
        "w-[400px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected ? "border-primary ring-4 ring-primary/10" : "border-border/40 bg-card"
      )}
    >
      <CardHeader className="m-0 bg-muted/30 px-4 py-3 border-b border-border/50 flex flex-row items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex-1">
          Master Script
        </CardTitle>
        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest px-2">
          {data.label || "Project"}
        </span>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <Textarea
          value={data.text || ""}
          onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
          placeholder="Enter the master script for your video..."
          className="nodrag nopan nowheel min-h-[150px] p-4 text-sm leading-relaxed text-foreground font-medium bg-muted/10 border border-border/50 rounded-xl focus-visible:ring-primary/20 transition-all resize-none"
        />

        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            Connections
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
              <Handle
                id="bottom"
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background shadow-lg"
              />
              <span className="text-[10px] font-bold text-muted-foreground/80">Global Settings</span>
            </div>
            <div className="relative flex items-center justify-end gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-bold text-primary/80">Scene Flow</span>
              <Handle
                id="right"
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background shadow-lg hover:scale-110 transition-transform"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(GlobalScriptNode);
