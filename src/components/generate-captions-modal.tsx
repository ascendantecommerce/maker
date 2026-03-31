"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Zap, CheckCircle2, HelpCircle, Link2Icon, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { VideoPlayer } from "./ui/video-player";

type Step = "UPLOAD" | "CONFIGURE" | "PROCESSING";

interface GenerateCaptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateCaptionsModal({ open, onOpenChange }: GenerateCaptionsModalProps) {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  const [translate, setTranslate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setStep("CONFIGURE");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setStep("CONFIGURE");
    }
  };

  const handleGenerate = async () => {
    setStep("PROCESSING");
    setProgress(5);

    try {
      let finalUrl = previewUrl;

      // 1. If it's a local file, upload it
      if (file) {
        setProgress(10);
        const presignResponse = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "default-user",
            fileNames: [file.name],
          }),
        });

        if (!presignResponse.ok) throw new Error("Upload failed");
        const { uploads } = await presignResponse.json();
        const uploadData = uploads[0];

        setProgress(30);
        await fetch(uploadData.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        finalUrl = uploadData.url;
        setProgress(50);

        // Complete upload
        await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: "user_uploaded",
            assetType: "video",
            originalFilename: uploadData.originalFilename,
            uniqueFilename: uploadData.uniqueFilename,
            filePath: uploadData.filePath,
            publicUrl: finalUrl,
            fileSize: file.size,
            mimeType: file.type,
          }),
        });
      }

      if (!finalUrl) throw new Error("No video URL");

      // 2. Transcribe and save to R2
      setProgress(60);
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: finalUrl,
          saveToR2: true,
        }),
      });

      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      const transcribeData = await transcribeResponse.json();
      const transcriptionUrl = transcribeData.url;
      const duration = transcribeData.duration || 0;
      setProgress(80);

      // 3. Create Project, Schema, and Segment
      const projectPayload = {
        name: file?.name?.replace(/\.[^/.]+$/, "") || "AI Captions Project",
        type: "ai-captions",
        schemas: [
          {
            title: "AI Captions",
            aspect_ratio: "9:16",
            execution_mode: "live",
            visuals: { style: "cinematic" },
            caption: { style: "default" },
            segments: [
              {
                order: 0,
                clips: [
                  {
                    type: "video",
                    src: finalUrl,
                    duration: duration * 1000, // ms
                  },
                ],
                speechToText: {
                  src: transcriptionUrl,
                },
              },
            ],
          },
        ],
      };

      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
      });

      if (!projectResponse.ok) throw new Error("Project creation failed");
      const { project } = await projectResponse.json();
      const schemaId = project.schemas[0].id;

      setProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/quick-edit/${schemaId}`);
        reset();
      }, 500);
    } catch (error) {
      console.error("Generation failed:", error);
      setStep("CONFIGURE"); // Fallback to configure on error
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;
    setIsUrlLoading(true);
    try {
      const response = await fetch("/api/uploads/socials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }), // API expects { url }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch video");
      }

      const data = await response.json();
      if (data.url) {
        setPreviewUrl(data.url);
        setStep("CONFIGURE");
      }
    } catch (error) {
      console.error("Error uploading URL:", error);
    } finally {
      setIsUrlLoading(false);
    }
  };

  const reset = () => {
    setStep("UPLOAD");
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setUrl("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) reset();
      }}
    >
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card border-border rounded-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Generate captions with AI</DialogTitle>
          <DialogDescription>
            Upload a video and let AI generate trendy captions for you.
          </DialogDescription>
        </DialogHeader>

        {step === "UPLOAD" && (
          <div className="p-10 flex flex-col items-center">
            <div className="w-full text-center space-y-2 mb-10">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">AI Captions</h2>
              <p className="text-muted-foreground text-sm">
                Add stylish captions or translate your content with one click.
              </p>
            </div>

            {/* Drop Area / Upload Button */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-2xl h-40 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center space-y-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group relative bg-muted/30"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              <div className="text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-primary">Select file</span> or drop here
                </p>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium opacity-60">
                  MP4, MOV, WEBM, AVI
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div className="w-full max-w-2xl mt-10">
              <div className="relative group">
                <InputGroup className="h-11">
                  <InputGroupInput
                    placeholder="Paste video URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUrlSubmit();
                      }
                    }}
                    disabled={isUrlLoading}
                  />
                  <InputGroupAddon
                    className={cn(
                      "cursor-pointer hover:text-primary transition-colors",
                      isUrlLoading && "pointer-events-none opacity-50",
                    )}
                    onClick={handleUrlSubmit}
                  >
                    {isUrlLoading ? <Loader2 className="size-4 animate-spin" /> : <Link2Icon />}
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            <p className="mt-6 text-muted-foreground text-sm">
              You can upload videos up to 120 minutes long.
            </p>
          </div>
        )}

        {step === "CONFIGURE" && (
          <div className="flex flex-col h-full max-h-[90vh] pb-8">
            <div className="p-4 flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setStep("UPLOAD")}>
                <ArrowLeft className="size-5" />
              </Button>
              <div className="font-semibold">Configure captions</div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 pointer-events-none"
                onClick={() => setStep("UPLOAD")}
              >
                <ArrowLeft className="size-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-4">
              <div className="relative max-h-[400px] h-full bg-zinc-950 rounded-lg overflow-hidden group flex items-center justify-center">
                {previewUrl && (
                  <VideoPlayer className="h-full w-full" size="full" src={previewUrl} />
                )}
              </div>

              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Source Language</Label>
                  </div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[180px] bg-card border-border">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                      <SelectItem value="fr">🇫🇷 French</SelectItem>
                      <SelectItem value="de">🇩🇪 German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Multi-Speaker theme</Label>
                    <div className="p-1 rounded-full bg-muted text-muted-foreground">
                      <HelpCircle className="size-3" />
                    </div>
                  </div>
                  <Switch checked={multiSpeaker} onCheckedChange={setMultiSpeaker} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Translate</Label>
                    <Zap className="size-4 text-primary fill-primary" />
                  </div>
                  <Switch checked={translate} onCheckedChange={setTranslate} />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleGenerate} className="w-full text-sm font-bold rounded-lg">
                  Generate captions
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "PROCESSING" && (
          <div className="grid md:grid-cols-2 gap-8 p-12 h-full">
            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Scenify AI is working...</h3>
                <p className="text-muted-foreground">
                  Your video will be ready in {Math.round((100 - progress) / 3)}s
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Generating captions with AI", done: progress > 25 },
                  {
                    label: "Emojis generation",
                    done: progress > 50,
                    active: progress > 25 && progress <= 50,
                  },
                  {
                    label: "Highlighting important words",
                    done: progress > 75,
                    active: progress > 50 && progress <= 75,
                  },
                  {
                    label: "Creating captions animations",
                    done: progress >= 100,
                    active: progress > 75 && progress < 100,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 transition-colors",
                      item.done ? "text-foreground" : "text-muted-foreground",
                      item.active && "text-primary",
                    )}
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : item.active ? (
                      <Zap className="size-5 animate-pulse" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-muted" />
                    )}
                    <span className={cn("text-sm font-medium", item.active && "font-bold")}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-9/16 max-h-[500px] mx-auto w-full bg-card rounded-2xl overflow-hidden border-border flex items-center justify-center">
              {previewUrl && (
                <video src={previewUrl} className="w-full h-full object-cover blur-xl opacity-50" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
