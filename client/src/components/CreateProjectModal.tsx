import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { X, FileText, Film, Image as ImageIcon, Upload, ArrowRight, ArrowLeft } from "lucide-react";
import type { UploadResult } from "@uppy/core";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (projectId: string) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadURL: string;
  preview?: string;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (data: { title: string; files: UploadedFile[] }) => {
      // Create project first
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title }),
      });
      
      if (!projectResponse.ok) throw new Error("Failed to create project");
      const project = await projectResponse.json();

      // Upload all files to the project
      for (const file of data.files) {
        const normalizedPath = await normalizeObjectPath(file.uploadURL);
        const fileResponse = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            name: file.name,
            originalName: file.name,
            mimeType: file.mimeType,
            size: file.size.toString(),
            objectPath: normalizedPath,
          }),
        });
        
        if (!fileResponse.ok) {
          console.error("Failed to save file metadata:", file.name);
        }
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully!" });
      resetModal();
      onSuccess?.(project.id);
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const normalizeObjectPath = async (uploadURL: string): Promise<string> => {
    // Let the server handle normalization
    try {
      const response = await fetch("/api/objects/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadURL }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.objectPath;
      }
    } catch (error) {
      console.error("Error normalizing object path:", error);
    }
    
    // Fallback to simple normalization
    if (!uploadURL.startsWith("https://storage.googleapis.com/")) {
      return uploadURL;
    }
    
    const url = new URL(uploadURL);
    const rawObjectPath = url.pathname;
    
    // Extract the entity ID from the path
    const pathParts = rawObjectPath.split("/");
    if (pathParts.length >= 3) {
      const entityId = pathParts.slice(2).join("/");
      return `/objects/${entityId}`;
    }
    
    return rawObjectPath;
  };

  const resetModal = () => {
    setStep(1);
    setTitle("");
    setUploadedFiles([]);
    setUploading(false);
    onOpenChange(false);
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
    });
    
    if (!response.ok) throw new Error("Failed to get upload URL");
    const data = await response.json();
    
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const newFiles: UploadedFile[] = (result.successful || []).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name || "Unknown file",
      size: file.size || 0,
      mimeType: file.type || "application/octet-stream",
      uploadURL: file.uploadURL as string,
      preview: file.preview as string | undefined,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploading(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.startsWith("video/")) return <Film className="h-8 w-8 text-purple-500" />;
    if (mimeType === "application/pdf") return <FileText className="h-8 w-8 text-red-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceedToStep2 = title.trim().length > 0;
  const canCreateProject = uploadedFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create New Project - Step {step} of 2
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your project name"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
                className="flex items-center space-x-2"
              >
                <span>Next: Upload Files</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload Project Files</h3>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-lg text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Upload your project files</p>
                  <p className="text-sm text-muted-foreground">
                    Support for images, videos, and PDFs
                  </p>
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="mt-4"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </ObjectUploader>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                  <div className="grid gap-3">
                    {uploadedFiles.map((file) => (
                      <Card key={file.id}>
                        <CardContent className="flex items-center space-x-3 p-3">
                          <div className="flex-shrink-0">
                            {file.mimeType.startsWith("image/") && file.preview ? (
                              <img 
                                src={file.preview} 
                                alt={file.name}
                                className="h-12 w-12 object-cover rounded"
                              />
                            ) : (
                              getFileIcon(file.mimeType)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)} • {file.mimeType}
                            </p>
                          </div>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={() => createProjectMutation.mutate({ title, files: uploadedFiles })}
                disabled={!canCreateProject || createProjectMutation.isPending}
                className="flex items-center space-x-2"
              >
                {createProjectMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create Project</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}