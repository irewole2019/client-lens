import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Plus, ExternalLink, Copy, FileText, Image as ImageIcon, Film, Folder, MessageCircle, AlertCircle, Clock, FolderOpen } from "lucide-react";
import { GitHubPushButton } from "@/components/GitHubPushButton";
interface ProjectWithCommentStats {
  id: string;
  publicId: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  files?: any[];
  fileCount?: number;
  totalComments: number;
  unresolvedComments: number;
  lastCommentTime: Date | null;
  hasUnreadComments: boolean;
}

import { formatDistanceToNow } from "date-fns";

export default function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<ProjectWithCommentStats[]>({
    queryKey: ["/api/projects"],
  });

  const markProjectViewed = useMutation({
    mutationFn: (projectId: string) =>
      fetch(`/api/projects/${projectId}/viewed`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const copyShareLink = (publicId: string) => {
    const shareUrl = `${window.location.origin}/p/${publicId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Share link copied to clipboard!" });
  };

  const handleProjectClick = (projectId: string) => {
    markProjectViewed.mutate(projectId);
    setLocation(`/projects/${projectId}`);
  };

  const getProjectThumbnail = (project: ProjectWithCommentStats) => {
    if (!project.files || project.files.length === 0) {
      return (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <Folder className="h-8 w-8 text-slate-400" />
        </div>
      );
    }

    // Find first image
    const firstImage = project.files.find((f: any) => f.mimeType.startsWith("image/"));
    if (firstImage) {
      return (
        <img
          src={firstImage.objectPath}
          alt={project.title}
          className="w-full h-full object-cover"
        />
      );
    }

    // Find first video
    const firstVideo = project.files.find((f: any) => f.mimeType.startsWith("video/"));
    if (firstVideo) {
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
          <video
            src={firstVideo.objectPath}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <Film className="h-8 w-8 text-white" />
          </div>
        </div>
      );
    }

    // Find first PDF
    const firstPDF = project.files.find((f: any) => f.mimeType === "application/pdf");
    if (firstPDF) {
      return (
        <div className="w-full h-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
    );
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">
            Manage your project files and share them publicly
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GitHubPushButton />
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Folder className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Create your first project and start uploading files to get started
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="relative bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 flex flex-col gap-3 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
              onClick={() => handleProjectClick(project.id)}
            >
              {/* Thumbnail */}
              <div className="relative h-32 w-full rounded-lg overflow-hidden">
                {getProjectThumbnail(project)}
                
                {/* Unread Badge */}
                {project.hasUnreadComments && (
                  <span className="absolute top-2 right-2 bg-red-600 text-xs text-white px-2 py-1 rounded-full shadow font-medium">
                    New
                  </span>
                )}
              </div>
              
              {/* Project Info */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
                      {project.title}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-3">
                        <span>{project.fileCount || 0} files</span>
                        <span>{project.totalComments} comments</span>
                        {project.unresolvedComments > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {project.unresolvedComments} unresolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {project.lastCommentTime && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
                      Last: {formatDistanceToNow(new Date(project.lastCommentTime), { addSuffix: true })}
                    </div>
                  )}
                </div>

                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyShareLink(project.publicId);
                    }}
                    className="flex-1 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/p/${project.publicId}`, '_blank');
                    }}
                    className="flex-1 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Public
                  </Button>
                </div>
                
                {/* Created Date */}
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => setShowCreateModal(false)}
      />
      </div>
    </div>
  );
}