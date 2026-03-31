"use client";

import { useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";

export type UploadStatus = "idle" | "uploading" | "indexing" | "success" | "error";

interface UseVideoUploadOptions {
  onSuccess?: (data: {
    videoId: string;
    projectId: string;
    publicUrl: string;
    projectName?: string;
  }) => void;
  onError?: (error: string) => void;
}

export function useVideoUpload({ onSuccess, onError }: UseVideoUploadOptions = {}) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setStatusMessage("");
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File, projectId?: string, projectName?: string) => {
      if (!file.type.startsWith("video/")) {
        const errorMsg = "Please upload a video file.";
        setError(errorMsg);
        setStatus("error");
        onError?.(errorMsg);
        return;
      }

      const userId = session?.user?.id;
      if (!userId) {
        const errorMsg = "Please sign in to upload.";
        setError(errorMsg);
        setStatus("error");
        onError?.(errorMsg);
        return;
      }

      try {
        setStatus("uploading");
        setError(null);
        setProgress(0);
        setStatusMessage("Getting upload url...");

        // 1. Get Presigned URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            fileNames: [file.name],
            contentTypes: [file.type],
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get upload authorization");

        const { uploads } = await presignRes.json();
        const uploadData = uploads[0]; // Assuming single file upload for now

        // 2. Upload to R2
        setStatusMessage("Uploading video to storage...");

        const uploadRes = await fetch(uploadData.presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error("Upload to R2 failed");
        }

        setProgress(100);

        // 3. Get metadata & Complete Upload
        setStatusMessage("Finalizing upload...");

        // Extract duration and dimensions from video file
        const getMetadata = (
          file: File,
        ): Promise<{ duration: number; width: number; height: number }> => {
          return new Promise((resolve) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
              });
            };
            video.onerror = () => {
              resolve({ duration: 0, width: 0, height: 0 }); // Fallback
            };
            video.src = window.URL.createObjectURL(file);
          });
        };

        const { duration, width, height } = await getMetadata(file);

        const completeBody = {
          projectId,
          sourceType: "user_uploaded",
          assetType: "video",
          originalFilename: file.name,
          uniqueFilename: uploadData.uniqueFilename,
          filePath: uploadData.filePath,
          publicUrl: uploadData.url,
          fileSize: file.size,
          mimeType: file.type,
          duration,
          width,
          height,
        };

        const completeRes = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completeBody),
        });

        if (!completeRes.ok) throw new Error("Failed to finalize upload");

        const { asset } = await completeRes.json();

        // Indexing is now handled server-side on-demand
        /*
        try {
          const geminiRes = await fetch('/api/uploads/process-gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: asset.id }),
          });

          if (!geminiRes.ok) {
            console.error('Gemini upload failed:', await geminiRes.text());
          }
        } catch (err) {
          console.error('Failed to index video with Gemini:', err);
        }
        */

        setStatus("success");
        setStatusMessage("Upload complete!");
        const completionData = {
          videoId: asset.id,
          projectId: asset.project_id || projectId || "",
          publicUrl: asset.public_url,
          projectName: projectName,
        };
        onSuccess?.(completionData);
        return completionData;
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.message || "Something went wrong. Please try again.";
        setError(errorMsg);
        setStatus("error");
        onError?.(errorMsg);
      }
    },
    [onSuccess, onError, session],
  );

  return {
    status,
    progress,
    statusMessage,
    error,
    uploadFile,
    reset,
    isWorking: status === "uploading" || status === "indexing",
  };
}
