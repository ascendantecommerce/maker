import { R2StorageService } from "./r2-storage";
import { config } from "@/inngest/config";

export interface UploadResult {
  fileName: string;
  filePath: string;
  contentType: string;
  presignedUrl: string;
  url: string;
}

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export const uploadBase64ToR2 = async (
  base64Data: string,
  fileName: string,
  contentType: string = "image/png",
): Promise<string> => {
  // Strip off the data URL prefix if present
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");
  return r2.uploadData(fileName, buffer, contentType);
};

export const uploadFile = async (file: File, userId?: string): Promise<UploadResult> => {
  // 1. Get presigned URL
  const body: any = {
    fileNames: [file.name],
  };

  if (userId) {
    body.userId = userId;
  }

  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to get presigned URL");
  }

  const { uploads } = await response.json();
  const uploadConfig = uploads[0];

  // 2. Upload to R2
  const uploadResponse = await fetch(uploadConfig.presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage");
  }

  return uploadConfig;
};
