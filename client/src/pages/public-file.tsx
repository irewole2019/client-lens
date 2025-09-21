import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ProjectAssetDetail } from "@/components/ProjectAssetDetail";
import { VideoWithComments } from "@/components/VideoWithComments";
import { PDFWithComments } from "@/components/PDFWithComments";
import { CommentSidebar } from "@/components/CommentSidebar";
import { FilePreview } from "@/components/ui/file-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, Share } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { File } from "@shared/schema";

interface PublicFile extends File {
  project: {
    id: string;
    publicId: string;
    title: string;
  };
}

export default function PublicFile() {
  const [, params] = useRoute("/f/:publicId");
  const publicId = params?.publicId;
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: file, isLoading, error } = useQuery<PublicFile>({
    queryKey: ["/api/public/files", publicId],
    enabled: !!publicId,
  });

  const handleCommentClick = (commentId: string) => {
    setHighlightedCommentId(commentId);
    // Auto-hide highlight after 3 seconds
    setTimeout(() => setHighlightedCommentId(null), 3000);
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

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Share link copied to clipboard!" });
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
              <span>Loading file...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !file) {
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
                <h2 className="text-xl font-semibold mb-2">File Not Found</h2>
                <p className="text-muted-foreground">
                  The file link may be invalid or the file may have been removed.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={`/p/${file.project.publicId}`}>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to {file.project.title}</span>
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShareLink}
                className="flex items-center space-x-2"
              >
                <Share className="h-4 w-4" />
                <span>Share File</span>
              </Button>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Lens</h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{file.name}</h2>
          <p className="text-muted-foreground">
            From project: {file.project.title} • {formatFileSize(file.size)} • {file.mimeType}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
          {/* File viewer */}
          <div className="lg:col-span-2">
            {renderFileWithComments(file)}
          </div>
          
          {/* Comment sidebar */}
          <div className="lg:col-span-1">
            <CommentSidebar 
              fileId={file.id}
              onCommentClick={handleCommentClick}
              highlightedCommentId={highlightedCommentId || undefined}
            />
          </div>
        </div>
      </main>
    </div>
  );
}