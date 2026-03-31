"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ImageIcon,
  Download,
  Upload,
} from "lucide-react";
import { uploadFile } from "@/lib/upload-utils";
import { authClient } from "@/lib/auth-client";
import { Textarea } from "@/components/ui/textarea";

interface AnalysisResult {
  analysis: {
    coreProductDetails: string;
    productComponents: string;
    visualDNA: string;
    targetAudienceVibe: string;
  };
  prompts: {
    category: string;
    prompt: string;
  }[];
}

export default function VisionToPromptPlayground() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { data: session } = authClient.useSession();

  // For individual prompt generation
  const [generatingIndices, setGeneratingIndices] = useState<Set<number>>(new Set());
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generationStatuses, setGenerationStatuses] = useState<Record<number, string>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!session?.user) {
        toast.error("Please sign in to upload images");
        return;
      }

      setIsUploading(true);
      const uploadPromises = acceptedFiles.map((file) => uploadFile(file, session.user.id));

      try {
        const results = await Promise.all(uploadPromises);
        const newUrls = results.map((r) => r.url);
        setImageUrls((prev) => [...prev, ...newUrls]);
        toast.success(`Uploaded ${acceptedFiles.length} image(s)`);
      } catch (error: any) {
        console.error("Upload failed:", error);
        toast.error("Failed to upload one or more images");
      } finally {
        setIsUploading(false);
      }
    },
    [session],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    disabled: isUploading,
  });

  const handleAddUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleAnalyze = async () => {
    if (imageUrls.length === 0) {
      toast.error("Please add at least one image URL");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedImages({});
    setGenerationStatuses({});
    setGeneratingIndices(new Set());

    try {
      const response = await fetch("/api/vision-to-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls,
          productName,
          productDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data);
      setProductName("");
      setProductDescription("");
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Error analyzing images:", error);
      toast.error(error.message || "Failed to analyze images");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = async (prompt: string, index: number) => {
    setGeneratingIndices((prev) => new Set(prev).add(index));
    setGenerationStatuses((prev) => ({
      ...prev,
      [index]: "Submitting task...",
    }));

    try {
      const response = await fetch("/api/kie/image-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_input: imageUrls,
          aspect_ratio: "9:16",
          resolution: "1K",
          output_format: "png",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.msg || "Generation failed");
      }

      const taskId = data.data.taskId;
      pollStatus(taskId, index);
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to start generation");
      setGeneratingIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      setGenerationStatuses((prev) => ({ ...prev, [index]: "Failed" }));
    }
  };

  const pollStatus = async (taskId: string, index: number) => {
    setGenerationStatuses((prev) => ({
      ...prev,
      [index]: "Generating image...",
    }));

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kie/status?taskId=${taskId}&type=image`);
        const result = await response.json();

        if (!response.ok) {
          clearInterval(interval);
          setGeneratingIndices((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          setGenerationStatuses((prev) => ({ ...prev, [index]: "Failed" }));
          toast.error(result.msg || "Status check failed");
          return;
        }

        const { state, resultJson, failMsg } = result.data;

        if (state === "success") {
          clearInterval(interval);
          setGeneratingIndices((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          setGenerationStatuses((prev) => ({ ...prev, [index]: "Success" }));
          const results = JSON.parse(resultJson);
          setGeneratedImages((prev) => ({
            ...prev,
            [index]: results.resultUrls[0],
          }));
          toast.success("Image generated!");
        } else if (state === "fail") {
          clearInterval(interval);
          setGeneratingIndices((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          setGenerationStatuses((prev) => ({ ...prev, [index]: "Failed" }));
          toast.error(failMsg || "Generation failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vision-to-Prompt Playground</h1>
        <p className="text-muted-foreground">
          Analyze product images and generate cinematic b-roll assets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input and Analysis */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Upload files or add image URLs for analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={`
                                    border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                                    ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}
                                    ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
                                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                {isUploading ? (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                ) : isDragActive ? (
                  <p className="text-sm text-primary">Drop images here</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP up to 10MB</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or add via URL</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  disabled={isUploading}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleAddUrl}
                  disabled={isUploading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {imageUrls.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-muted rounded text-xs group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-8 w-8 rounded overflow-hidden shrink-0 border bg-background">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <span className="truncate flex-1 mr-2">{url}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground opacity-70 tracking-widest">
                    Product Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Lavender Sleep Mist"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground opacity-70 tracking-widest">
                    Description / Benefits
                  </label>
                  <Textarea
                    placeholder="Briefly describe the product..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="min-h-[80px] text-sm resize-none"
                  />
                </div>
              </div>

              <Button
                className="w-full mt-2"
                size="lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isUploading || imageUrls.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Analyze Product
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {analysisResult && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <p className="font-semibold text-primary mb-1 uppercase tracking-wider">
                    Core Details
                  </p>
                  <p className="text-muted-foreground">
                    {analysisResult.analysis.coreProductDetails}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-1 uppercase tracking-wider">
                    Product Components
                  </p>
                  <p className="text-muted-foreground">
                    {analysisResult.analysis.productComponents}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-1 uppercase tracking-wider">
                    Visual DNA
                  </p>
                  <p className="text-muted-foreground">{analysisResult.analysis.visualDNA}</p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-1 uppercase tracking-wider">
                    Target Audience
                  </p>
                  <p className="text-muted-foreground">
                    {analysisResult.analysis.targetAudienceVibe}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right/Middle Columns: Prompts and Results */}
        <div className="lg:col-span-2 space-y-6">
          {analysisResult ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Generated Prompts
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    analysisResult.prompts.forEach((p, i) => {
                      if (!generatingIndices.has(i) && !generatedImages[i]) {
                        handleGenerateImage(p.prompt, i);
                      }
                    });
                  }}
                  disabled={
                    generatingIndices.size > 0 ||
                    analysisResult.prompts.every((_, i) => generatedImages[i])
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Generate All
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {analysisResult.prompts.map((p, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="p-6 border-r flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-primary mb-2 opacity-70 tracking-widest">
                            {p.category}
                          </div>
                          <p className="text-sm leading-relaxed mb-4 italic text-muted-foreground">
                            "{p.prompt}"
                          </p>
                        </div>
                        <Button
                          className="w-full mt-auto"
                          onClick={() => handleGenerateImage(p.prompt, i)}
                          disabled={generatingIndices.has(i)}
                        >
                          {generatingIndices.has(i) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                              {generationStatuses[i]}
                            </>
                          ) : (
                            <>
                              <ImageIcon className="mr-2 h-4 w-4" /> Generate Asset
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-muted flex items-center justify-center min-h-[200px] relative">
                        {generatedImages[i] ? (
                          <div className="w-full h-full relative group">
                            <img
                              src={generatedImages[i]}
                              alt={p.category}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-white border-white/40 hover:bg-white/20"
                                asChild
                              >
                                <a
                                  href={generatedImages[i]}
                                  download={`${p.category}.png`}
                                  target="_blank"
                                >
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </a>
                              </Button>
                            </div>
                          </div>
                        ) : generatingIndices.has(i) ? (
                          <div className="flex flex-col items-center gap-3 animate-pulse">
                            <RefreshCw className="h-8 w-8 text-primary/40 animate-spin" />
                            <span className="text-[10px] uppercase font-medium text-muted-foreground">
                              {generationStatuses[i]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-20">
                            <ImageIcon className="h-12 w-12" />
                            <span className="text-[10px] uppercase font-bold tracking-tighter">
                              Preview
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-12 text-center bg-muted/20">
              <Sparkles className="h-12 w-12 mb-4 opacity-10" />
              <h3 className="text-lg font-medium">Ready for Analysis</h3>
              <p className="text-sm max-w-xs mb-6">
                Add your product images on the left and click "Analyze Images" to start the
                workflow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
