"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Package, Image as ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: {
    products?: { id: string; name: string; url: string }[];
  };
  selected?: boolean;
}) {
  const hasProducts = data.products && data.products.length > 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col w-[400px] bg-card border-2 rounded-lg shadow-2xl transition-all overflow-hidden",
        selected ? "border-blue-800" : "border-border hover:border-input/80",
      )}
      style={{ width: 260 }}
    >
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1">
        <Package className="w-4 h-4 text-orange-400 drop-shadow-md" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground drop-shadow-md">
          Product References
        </span>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col gap-3">
        {hasProducts ? (
          <div className="grid grid-cols-2 gap-2">
            {data.products!.map((product, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 group/img"
              >
                <img
                  src={product.url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-background/80 backdrop-blur-sm border-t border-border">
                  <p className="text-[9px] font-bold text-foreground truncate text-center">
                    {product.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-lg bg-muted/20 gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">
              No product images attached
            </p>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <Package className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <ImageIcon className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-bottom-4 !left-1/2 !-translate-x-1/2 z-10 shadow-lg"
      >
        <Plus className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
    </div>
  );
}
