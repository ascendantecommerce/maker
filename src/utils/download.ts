import mime from "mime/lite";

export const download = (url: string, filename: string) => {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${filename}.mp4`); // Specify the filename for the downloaded video
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch((error) => console.error("Download error:", error));
};

export async function fileUrlToBuffer(
  fileUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    // Fetch the file as an array buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Extract MIME type from the response headers
    let contentType = response.headers.get("content-type") || "application/octet-stream";
    console.log("contentType", contentType);
    // Fallback to URL extension if MIME is generic or bin
    const urlObj = new URL(fileUrl);
    const urlPath = urlObj.pathname.toLowerCase();
    const urlExt = urlPath.split(".").pop()?.split(/[?#]/)[0];

    const isGeneric =
      contentType === "application/octet-stream" ||
      contentType === "binary/octet-stream" ||
      !contentType;

    if (isGeneric && urlExt) {
      const inferredMime = mime.getType(urlExt);
      if (inferredMime) contentType = inferredMime;
    }

    // Convert the array buffer to a Node.js buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the buffer, MIME type, and size
    return { buffer, contentType };
  } catch (error) {
    console.error("Error converting URL to buffer:", error);
    throw error;
  }
}
