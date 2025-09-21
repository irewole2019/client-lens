import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ProjectAssetDetail } from "@/components/ProjectAssetDetail";
import { VideoWithComments } from "@/components/VideoWithComments";
import { PDFWithComments } from "@/components/PDFWithComments";
import { CommentSidebar } from "@/components/CommentSidebar";
import { FilePreview } from "@/components/ui/file-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { File } from "@shared/schema";

interface PublicProject {
  id: string;
  publicId: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  files: File[];
}

export default function PublicProject() {
  const [, params] = useRoute("/p/:publicId");
  const publicId = params?.publicId;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: project, isLoading, error } = useQuery<PublicProject>({
    queryKey: ["/api/public/projects", publicId],
    enabled: !!publicId,
  });

  const handleViewFile = (file: File) => {
    setSelectedFile(file);
  };

  const getFileType = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    return "other";
  };

  const formatFileSize = (sizeStr: string) => {
    const size = parseInt(sizeStr);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  const handleCommentClick = (commentId: string) => {
    setHighlightedCommentId(commentId);
    // Auto-hide highlight after 3 seconds
    setTimeout(() => setHighlightedCommentId(null), 3000);
  };

  const renderFileWithComments = (file: File) => {
    const fileType = getFileType(file.mimeType);
    
    switch (fileType) {
      case "image":
        return (
          <ProjectAssetDetail
            fileId={file.id}
            src={file.objectPath}
            alt={file.name}
          />
        );
      case "video":
        return <VideoWithComments file={file} isPublic={true} />;
      case "pdf":
        return (
          <PDFWithComments 
            file={file} 
            isPublic={true} 
            onCommentClick={handleCommentClick}
            highlightedCommentId={highlightedCommentId || undefined}
          />
        );
      default:
        return <FilePreview file={file} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Lens</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading project...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Lens</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
                <p className="text-muted-foreground">
                  The project link may be invalid or the project may have been removed.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to {project.title}</span>
                </Button>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Lens</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{selectedFile.name}</h2>
            <p className="text-muted-foreground">
              {formatFileSize(selectedFile.size)} • {selectedFile.mimeType}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
            {/* File viewer */}
            <div className="lg:col-span-2">
              {renderFileWithComments(selectedFile)}
            </div>
            
            {/* Comment sidebar */}
            <div className="lg:col-span-1">
              <CommentSidebar 
                fileId={selectedFile.id}
                onCommentClick={handleCommentClick}
                highlightedCommentId={highlightedCommentId || undefined}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Lens</h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {project.title}
          </h1>
          <p className="text-muted-foreground">
            Public project • {project.files.length} {project.files.length === 1 ? 'file' : 'files'}
          </p>
        </div>

        {project.files.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No Files Yet</h3>
                <p className="text-muted-foreground">
                  This project doesn't have any files uploaded yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.files.map((file) => {
              const fileType = getFileType(file.mimeType);
              
              return (
                <Card key={file.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="relative mb-3">
                      {fileType === "image" ? (
                        <img
                          src={file.objectPath}
                          alt={file.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">
                              {fileType === "video" ? "🎥" : fileType === "pdf" ? "📄" : "📎"}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-medium">
                              {fileType}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleViewFile(file)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View & Comment
                      </Button>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-semibold truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}