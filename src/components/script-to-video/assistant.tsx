"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpIcon, MessageCircle, Image as ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScriptStore } from "@/stores/script-store";
import { useVideoConfigStore } from "@/stores/video-config-store";
import { useSchemaStore } from "@/stores/schema-store";
import { streamFlow } from "@genkit-ai/next/client";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFile } from "@/lib/upload-utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface Message {
  role: "user" | "model";
  content: string;
  status?: string;
}

interface AssistantProps {
  endpoint?: string;
  flowName?: string;
}

export const Assistant = ({
  endpoint = "/api/chat/script-to-video",
  flowName = "scriptToVideoFlow",
}: AssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = authClient.useSession();

  const { setScript } = useScriptStore();
  const { params, setParams } = useVideoConfigStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!session?.user?.id) {
      toast.error("Please sign in to upload images");
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const toastId = toast.loading("Uploading product image...");
    setIsUploadingProduct(true);

    try {
      const result = await uploadFile(file, session.user.id);

      const newProductImage = {
        id: crypto.randomUUID(),
        name: file.name,
        url: result.url,
      };

      setParams((prev: any) => ({
        ...prev,
        productImage: newProductImage,
      }));
      useSchemaStore.getState().updateSchema({
        productImage: newProductImage,
      });

      toast.success("Product image uploaded! Ready for script generation.", {
        id: toastId,
      });
    } catch (error) {
      console.error("Product image error:", error);
      toast.error("Failed to upload product image", { id: toastId });
    } finally {
      setIsUploadingProduct(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeProductImage = () => {
    setParams((prev: any) => ({
      ...prev,
      productImage: undefined,
    }));
    useSchemaStore.getState().updateSchema({
      productImage: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        const scrollElement = scrollRef.current?.closest("[data-radix-scroll-area-viewport]");
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  const handleSubmit = async (suggestionText?: string) => {
    const messageText = suggestionText || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      role: "model",
      content: "",
      status: "running",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const flow = streamFlow({
        url: endpoint,
        input: {
          message: messageText,
          productImageUrl: params.productImage?.url,
        },
      });

      for await (const chunkStr of flow.stream) {
        const chunk = JSON.parse(chunkStr);

        if (chunk.event === "reasoning") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, status: "thinking" }];
          });
        }

        if (chunk.event === "tool") {
          console.log("Tool call from flow:", chunk, chunk.name, chunk.arg);
          handleToolAction({
            action: chunk.name,
            ...chunk.arg,
            ...chunk.response,
          });
        }
      }

      const result = await flow.output;
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "model", content: result.reply, status: "complete" },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "model", content: "Something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolAction = (input: any) => {
    console.log("handleToolAction", input);
    const { action, ...args } = input;

    if (action === "update_video_config" || action === "update_ugc_config") {
      if (args.script) {
        // Sanitize script: remove literal \n characters that might be sent by the LLM
        const cleanScript = args.script.replace(/\\n/g, "\n").replace(/\n\s*\n/g, "\n\n");
        setScript(cleanScript);
        useSchemaStore.getState().updateSchema({ script: cleanScript });
      }
      
      if (args.blocks) {
        setParams((prev: any) => ({ ...prev, blocks: args.blocks }));
        useSchemaStore.getState().updateSchema({ blocks: args.blocks });
      }

      setParams((prev: any) => {
        const updates: any = {};
        if (args.type) updates.type = args.type;
        if (args.aspectRatio) updates.aspectRatio = args.aspectRatio;
        if (args.duration) updates.duration = parseInt(args.duration.toString(), 10);
        if (args.quality) updates.quality = args.quality;

        if (args.visualType || args.visualStyle) {
          updates.visuals = {
            ...(prev.visuals || {}),
          };
          if (args.visualType) updates.visuals.type = args.visualType;
          if (args.visualStyle) {
            updates.visuals.style = args.visualStyle.toLowerCase();
          }
        }

        if (args.captionPosition || args.captionSize) {
          updates.caption = {
            ...(prev.caption || {}),
          };
          if (args.captionPosition) updates.caption.position = args.captionPosition;
          if (args.captionSize) updates.caption.size = args.captionSize;
        }

        useSchemaStore.getState().updateSchema(updates);
        return updates;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground text-sm overflow-hidden border-r">
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-x-hidden p-4 md:p-6 space-y-2">
          {messages.length === 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="p rounded-lg space-y-2 w-80%">
                Fresh project — describe what you want to see, or let's brainstorm about where to
                start.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300",
                    m.role === "user" ? "flex-row-reverse" : "flex-row max-w-[90%]",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col space-y-3 w-full min-w-0",
                      m.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm transition-all min-w-0 flex flex-col",
                        m.role === "user"
                          ? "bg-foreground/10 rounded-tr-none font-medium px-5"
                          : "bg-card text-card-foreground rounded-tl-none w-full px-5",
                      )}
                    >
                      <div className="w-full grid overflow-hidden">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ className, ...props }) => (
                              <h1
                                className={cn(
                                  "scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            h2: ({ className, ...props }) => (
                              <h2
                                className={cn(
                                  "mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            h3: ({ className, ...props }) => (
                              <h3
                                className={cn(
                                  "mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            p: ({ className, ...props }) => (
                              <p className={cn("leading-7 not-first:mt-6", className)} {...props} />
                            ),
                            ul: ({ className, ...props }) => (
                              <ul
                                className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
                                {...props}
                              />
                            ),
                            ol: ({ className, ...props }) => (
                              <ol
                                className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
                                {...props}
                              />
                            ),
                            code: ({ className, children, ...props }) => {
                              const isInline = !className?.includes("language-");
                              return (
                                <code
                                  className={cn(
                                    isInline && "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
                                    className,
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ className, ...props }) => (
                              <pre
                                className={cn(
                                  "overflow-x-auto rounded-lg bg-black p-4 text-white my-4",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col space-y-3 w-full min-w-0 items-start">
                    <div className="py-3.5 px-5 rounded-3xl text-[15px] leading-relaxed shadow-sm bg-card text-card-foreground rounded-tl-none w-fit">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                        </div>
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                          Thinking
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 space-y-4 shrink-0">
        <InputGroup>
          <InputGroupTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask, Search or Chat..."
            className="min-h-11 max-h-50"
          />
          <InputGroupAddon align="block-end">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />

            {params.productImage || isUploadingProduct ? (
              <div className="flex items-center gap-2 px-3 h-9 bg-muted/50 rounded-lg border border-border text-xs mr-1">
                {isUploadingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="max-w-[120px] truncate font-medium">
                      {params.productImage?.name}
                    </span>
                    <button
                      onClick={removeProductImage}
                      className="ml-1 p-0.5 hover:bg-background rounded-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      title="Remove product image"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <InputGroupButton
                variant="ghost"
                className="rounded-lg h-9 px-3 text-xs gap-1.5 font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Add Product Image"
              >
                <span className="text-base leading-none mb-0.5">+</span> Product
              </InputGroupButton>
            )}

            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
              size="icon-xs"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
            >
              <ArrowUpIcon className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
};
