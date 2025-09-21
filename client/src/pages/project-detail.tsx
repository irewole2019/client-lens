import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, CloudUpload, Eye, Trash2, Share, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProjectWithFiles, FileRecord, getFileType, formatFileSize, formatTimeAgo } from "@/lib/types";
import { ProjectAssetDetail } from "../components/ProjectAssetDetail";
import { CommentSidebar } from "../components/CommentSidebar";
import { ObjectUploader } from "../components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery<ProjectWithFiles>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const createFileMutation = useMutation({
    mutationFn: async (fileData: {
      projectId: string;
      name: string;
      originalName: string;
      mimeType: string;
      size: string;
      objectPath: string;
    }) => {
      const response = await apiRequest("POST", "/api/files", fileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save file information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const { uploadURL } = await response.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  const handleComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful) {
      result.successful.forEach((file) => {
        if (file.uploadURL && projectId) {
          const sizeInBytes = file.size || 0;
          createFileMutation.mutate({
            projectId,
            name: file.name || "Unknown file",
            originalName: file.name || "Unknown file",
            mimeType: file.type || "application/octet-stream",
            size: sizeInBytes.toString(),
            objectPath: file.uploadURL,
          });
        }
      });
    }
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleViewFile = (file: FileRecord) => {
    setSelectedFile(file);
  };

  const handleShareFile = (file: FileRecord) => {
    const shareUrl = `${window.location.origin}/f/${file.publicId || file.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "File share link copied!",
      description: "Anyone with this link can view and comment on this file.",
    });
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Validate file size (10MB limit)
        if (file.size > 10485760) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // Get upload URL
        const response = await handleGetUploadParameters();
        
        // Upload file directly to storage
        const uploadResponse = await fetch(response.url, {
          method: response.method,
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok && projectId) {
          // Save file metadata
          createFileMutation.mutate({
            projectId,
            name: file.name,
            originalName: file.name,
            mimeType: file.type,
            size: file.size.toString(),
            objectPath: response.url,
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [projectId, handleGetUploadParameters, createFileMutation, toast]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleDrop({ 
        preventDefault: () => {}, 
        stopPropagation: () => {}, 
        dataTransfer: { files } 
      } as any);
    }
  }, [handleDrop]);

  const renderFileWithComments = (file: FileRecord) => {
    const fileType = getFileType(file.mimeType);
    
    switch (fileType) {
      case "image":
        return (
          <ProjectAssetDetail
            fileId={file.id}
            src={file.objectPath}
            alt={file.originalName}
          />
        );
      case "video":
        return (
          <div className="w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
            <video
              src={file.objectPath}
              className="w-full h-full object-contain rounded-lg"
              controls
              playsInline
            />
          </div>
        );
      case "pdf":
        return (
          <div className="w-full h-96 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{file.originalName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                PDF • {formatFileSize(parseInt(file.size))}
              </p>
              <Button 
                className="mt-4"
                onClick={() => window.open(file.objectPath, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PDF
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-96 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📎</div>
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{file.originalName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {fileType.toUpperCase()} • {formatFileSize(parseInt(file.size))}
              </p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900">Client Lens</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
            <div className="h-32 bg-slate-200 rounded mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-square bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Project not found</h2>
          <p className="text-slate-600 mb-4">The project you're looking for doesn't exist.</p>
          <Link href="/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900">Client Lens</h1>
              <nav className="ml-8 hidden md:block">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Link href="/projects" className="hover:text-slate-700">Projects</Link>
                  <span>/</span>
                  <span className="text-slate-900">{project.title}</span>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">User #1</span>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{project.title}</h2>
              <p className="text-slate-600 mt-1">Project files and assets</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500">
              {project.files?.length || 0} files uploaded
            </span>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary hover:bg-primary/90"
              data-testid="upload-button"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* File Upload Area */}
        <div 
          className={`bg-white rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 mb-6 cursor-pointer relative ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
            data-testid="file-input"
          />
          
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
            isDragOver ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <CloudUpload className={`w-6 h-6 ${isDragOver ? 'text-blue-500' : 'text-slate-400'}`} />
          </div>
          
          {isUploading ? (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-900">Uploading files...</h3>
              <div className="w-32 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : isDragOver ? (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-blue-600">Drop files to upload</h3>
              <p className="text-blue-500">Release to start uploading</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-900">Drop files here or click to browse</h3>
              <p className="text-slate-500">Select multiple files to upload at once</p>
              <p className="text-xs text-slate-400">Supports images, videos, and PDFs up to 10MB each</p>
            </div>
          )}
        </div>

        {/* File Grid */}
        {project.files && project.files.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {project.files.map((file) => {
              const fileType = getFileType(file.mimeType);
              const sizeInBytes = parseInt(file.size, 10);
              
              return (
                <div
                  key={file.id}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 group"
                >
                  <div className="aspect-square relative">
                    {fileType === "image" ? (
                      <img
                        src={file.objectPath}
                        alt={file.originalName}
                        className="w-full h-full object-cover cursor-crosshair"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFile(file);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl mb-2">
                            {fileType === "video" ? "🎥" : fileType === "pdf" ? "📄" : "📎"}
                          </div>
                          <div className="text-xs text-slate-500 uppercase font-medium">
                            {fileType}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-8 h-8 p-0 rounded-full"
                          onClick={() => handleViewFile(file)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-500"
                          onClick={() => handleShareFile(file)}
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-8 h-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                          onClick={() => handleDeleteFile(file.id)}
                          disabled={deleteFileMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.originalName}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(sizeInBytes)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CloudUpload className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No files uploaded yet</h3>
            <p className="text-slate-500 mb-6">Upload your first file to get started</p>
            <ObjectUploader
              maxNumberOfFiles={10}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleComplete}
              buttonClassName="bg-primary hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </ObjectUploader>
          </div>
        )}
      </main>

      {/* Enhanced File Preview Modal - Full Screen Experience */}
      {selectedFile && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50">
          {/* Header */}
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedFile.originalName}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(parseInt(selectedFile.size, 10))} • 
                      Uploaded {formatTimeAgo(selectedFile.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareFile(selectedFile)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content - Full Screen Layout */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
              {/* File Viewer - Scrollable */}
              <div className="lg:col-span-2 overflow-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="p-6">
                  {renderFileWithComments(selectedFile)}
                </div>
              </div>
              
              {/* Comment Sidebar - Scrollable */}
              <div className="lg:col-span-1 overflow-auto">
                <CommentSidebar 
                  fileId={selectedFile.id}
                  onCommentClick={(commentId) => {
                    // Scroll to and highlight comment
                    console.log("Focusing comment:", commentId);
                  }}
                  highlightedCommentId={undefined}
                />
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
