"use client";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/3gpp",
];

type UploadStatus = "idle" | "uploading" | "transcribing" | "creating" | "success" | "error";

export default function AICaptionsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    Sentry.setTag("page_name", "ai-captions-upload");
  }, []);

  const uploadFile = async (file: File) => {
    let projectId: string | null = null;

    try {
      setStatus("uploading");
      setError(null);
      setProgress(10);

      // Step 1: Get presigned URL with unique filename
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default-user",
          fileNames: [file.name],
        }),
      });

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json();
        throw new Error(errorData.details || "Failed to get upload URL");
      }

      const { uploads } = await presignResponse.json();
      const uploadData = uploads[0];
      setProgress(20);

      // Step 2: Upload file to presigned URL
      const uploadToStorageResponse = await fetch(uploadData.presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadToStorageResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const publicUrl = uploadData.url;
      setProgress(40);

      // Step 3: Create project first (so we can associate the asset with it)
      setStatus("creating");
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          type: "ai-captions",
        }),
      });

      if (!projectResponse.ok) {
        throw new Error("Failed to create project");
      }

      const { project } = await projectResponse.json();
      projectId = project.id;
      setProgress(55);

      // Step 4: Persist asset to database
      const assetResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          sourceType: "user_uploaded",
          assetType: "video",
          originalFilename: uploadData.originalFilename,
          uniqueFilename: uploadData.uniqueFilename,
          filePath: uploadData.filePath,
          publicUrl: publicUrl,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!assetResponse.ok) {
        console.warn("Failed to persist asset to database, but continuing...");
      }

      setProgress(70);

      // Step 5: Call transcribe API
      setStatus("transcribing");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: publicUrl,
        }),
      });

      if (!transcribeResponse.ok) {
        throw new Error("Failed to transcribe video");
      }

      const transcribeResult = await transcribeResponse.json();
      console.log("Transcribe API Response:", transcribeResult);
      posthog.capture("video_caption_generated", { projectId });
      setProgress(100);
      setStatus("success");

      // Step 6: Redirect to editor
      setTimeout(() => {
        router.push(`/edit/${project.id}`);
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "An error occurred");
      setProgress(0);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError("Please upload a valid video file (mp4, mov, avi, mkv, webm)");
      setStatus("error");
      return;
    }

    uploadFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const getStatusMessage = () => {
    switch (status) {
      case "uploading":
        return "Uploading video...";
      case "transcribing":
        return "Generating captions...";
      case "creating":
        return "Creating project...";
      case "success":
        return "Success! Redirecting...";
      case "error":
        return error || "An error occurred";
      default:
        return "Drag & drop anywhere or click to upload — mp3, wav, or webm";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
      case "transcribing":
      case "creating":
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Upload className="w-6 h-6" />;
    }
  };

  const isProcessing = ["uploading", "transcribing", "creating", "success"].includes(status);

  return (
    <main className="min-h-screen w-full bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl font-bold  mb-4 tracking-tight">AI Captions</h1>
          <p className="text-muted-foreground text-lg">
            Upload your video and let AI generate captions automatically
          </p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
              ${isDragging ? "scale-[1.02]" : "scale-[1]"}
              ${isProcessing ? "pointer-events-none opacity-75" : "hover:border-pink-500/50 hover:bg-zinc-900/70"}
            `}
          >
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Upload Button */}
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload file
                    </span>
                  )}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept={ACCEPTED_VIDEO_TYPES.join(",")}
                  onChange={handleFileInput}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>

              {/* Status Message */}
              <p>{getStatusMessage()}</p>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="w-full max-w-md">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-center text-xs text-zinc-500 mt-2">{progress}%</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Supported Formats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-zinc-500">Supported formats: MP4, MOV, AVI, MKV, WebM</p>
        </motion.div>
      </div>
    </main>
  );
}
