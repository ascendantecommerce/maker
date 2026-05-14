"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Package, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type ProductNodeData = {
  products?: { id: string; name: string; url: string }[];
};

export type ProductNode = Node<ProductNodeData, "product">;

function ProductNode({ id, data, selected }: NodeProps<ProductNode>) {
  const hasProducts = data.products && data.products.length > 0;

  return (
    <Card
      className={cn(
        "w-[300px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected ? "border-primary ring-4 ring-primary/10" : "border-border/40 bg-card",
      )}
    >
      <CardHeader className="m-0 bg-muted/30 px-4 py-3 border-b border-border/50 flex flex-row items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Brand Assets
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {hasProducts ? (
          <div className="grid grid-cols-2 gap-3">
            {data.products!.map((product, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/50 group/img shadow-sm"
              >
                <img
                  src={product.url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-background/90 backdrop-blur-md border-t border-border/50">
                  <p className="text-[9px] font-black text-foreground truncate text-center uppercase tracking-tighter">
                    {product.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border/50 shadow-inner">
              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              Empty Library
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 px-1">
            Library Sync
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
              <Handle
                id="target"
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background shadow-lg"
              />
              <span className="text-[10px] font-bold text-muted-foreground/80">Reference</span>
            </div>
            <div className="relative flex items-center justify-end gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-bold text-primary/80">To Scenes</span>
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

export default memo(ProductNode);
