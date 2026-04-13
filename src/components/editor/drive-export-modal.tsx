import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Folder as FolderIcon, Loader2, Plus, Trash2, Edit2, X } from "lucide-react";
import { toSlug } from "@/utils/format-title";
import { Compositor, Log } from "openvideo";

interface DriveFolder {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (newTitle: string) => void;
  studio: any;
}

export function DriveExportModal({ open, onOpenChange, title, onTitleChange, studio }: Props) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open]);

  const fetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch("/api/drive/folders");
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "needs_drive_auth") {
          startOAuthFlow();
          return;
        }
        throw new Error(data.error);
      }
      setFolders(data.folders || []);
    } catch (error) {
      toast.error("Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  };

  const startOAuthFlow = async () => {
    onOpenChange(false);
    try {
      const oauthRes = await fetch(
        `/api/drive/oauth?redirectBack=${encodeURIComponent(window.location.href)}`,
      );
      const oauthData = await oauthRes.json();
      if (oauthData.url) {
        toast.info("Redirecting to Google to connect Drive…");
        window.location.href = oauthData.url;
      } else {
        toast.error("Could not start Drive connection.");
      }
    } catch (e) {
      toast.error("Error setting up Drive integration.");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      const data = await res.json();
      setFolders((prev) => [data.folder, ...prev]);
      setSelectedFolderId(data.folder.id);
      setIsCreatingFolder(false);
      setNewFolderName("");
      toast.success("Folder created");
    } catch (err) {
      toast.error("Failed to create folder");
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (!editFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }
    try {
      const res = await fetch(`/api/drive/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFolderName }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: editFolderName } : f)));
      toast.success("Folder renamed");
    } catch (err) {
      toast.error("Failed to rename folder");
    } finally {
      setEditingFolderId(null);
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Move folder to Trash?")) return;
    try {
      const res = await fetch(`/api/drive/folders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
      toast.success("Folder deleted");
    } catch (err) {
      toast.error("Failed to delete folder");
    }
  };

  const handleExport = async () => {
    if (!studio) return;
    if (!selectedFolderId) {
      toast.error("Please select a destination folder");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Rendering video for Google Drive…");
    let com: Compositor | null = null;

    try {
      const json = studio.exportToJSON();
      if (!json.clips || json.clips.length === 0) throw new Error("No clips to export");

      const validClips = json.clips.filter((clipJSON: any) => {
        if (["Text", "Caption", "Effect", "Transition"].includes(clipJSON.type)) return true;
        return clipJSON.src && clipJSON.src.trim() !== "";
      });

      if (validClips.length === 0) throw new Error("No valid clips to export");

      const settings = json.settings || {};
      const studioOpts = studio.getOptions() || { width: 1920, height: 1080, fps: 30 };

      const combinatorOpts: any = {
        width: settings.width || studioOpts.width || 1920,
        height: settings.height || studioOpts.height || 1080,
        fps: studioOpts.fps || 30,
        bgColor: settings.bgColor || "#000000",
        format: "mp4",
        videoCodec: "avc1.42E032",
        bitrate: 10_000_000,
        audio: true,
        audioCodec: "aac",
        audioSampleRate: 48000,
      };

      com = new Compositor(combinatorOpts);

      await com.initPixiApp();
      await com.loadFromJSON({ ...json, clips: validClips });

      const stream = com.output();
      const blob = await new Response(stream).blob();
      const fileName = `${toSlug(title)}-${Date.now()}.mp4`;

      toast.loading("Uploading to Google Drive…", { id: toastId });

      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("fileName", fileName);
      formData.append("folderId", selectedFolderId);

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "needs_drive_auth") {
          toast.dismiss(toastId);
          setIsExporting(false);
          startOAuthFlow();
          return;
        }
        throw new Error(data.error || "Upload to Drive failed");
      }

      toast.success("Saved to Google Drive ✓", { id: toastId, duration: 8000 });
      onOpenChange(false);
    } catch (err) {
      Log.error("Save to Drive error:", err);
      toast.error("Failed to save: " + (err as Error).message, { id: toastId });
    } finally {
      if (com) com.destroy();
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export to Google Drive</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Video Name</label>
            <Input value={title} onChange={(e) => onTitleChange(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Folder</label>
              {!isCreatingFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setIsCreatingFolder(true)}
                >
                  <Plus className="size-3 mr-1" /> New Folder
                </Button>
              )}
            </div>

            {isCreatingFolder && (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  size={1}
                  className="h-8"
                  value={newFolderName}
                  ref={(el) => el?.focus()}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") setIsCreatingFolder(false);
                  }}
                  placeholder="Folder name"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-500"
                  onClick={handleCreateFolder}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => setIsCreatingFolder(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {loadingFolders ? (
              <div className="flex justify-center items-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border rounded-md">
                No folders found. Create one to continue.
              </div>
            ) : (
              <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex items-center justify-between p-2 cursor-pointer hover:bg-stone-800/10 dark:hover:bg-stone-800/50 ${selectedFolderId === folder.id ? "bg-stone-800/10 dark:bg-stone-800/50" : ""}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                      {editingFolderId === folder.id ? (
                        <div
                          className="flex w-full items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            ref={(el) => el?.focus()}
                            className="h-7 text-sm"
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameFolder(folder.id);
                              if (e.key === "Escape") setEditingFolderId(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-500"
                            onClick={() => handleRenameFolder(folder.id)}
                          >
                            <Check className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm truncate">{folder.name}</span>
                      )}
                    </div>
                    {editingFolderId !== folder.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditFolderName(folder.name);
                          }}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                        {selectedFolderId === folder.id && (
                          <div className="w-6 flex justify-center">
                            <Check className="size-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              (!selectedFolderId && folders.length > 0) ||
              (folders.length === 0 && !isCreatingFolder)
            }
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Exporting...
              </>
            ) : (
              "Export to Drive"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
