import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageWithComments } from "./ImageWithComments";
import { CommentModal } from "./CommentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Comment, InsertComment } from "@shared/schema";

const fetchComments = async (fileId: string): Promise<Comment[]> =>
  fetch(`/api/files/${fileId}/comments`).then(res => res.json());

export const ProjectAssetDetail: React.FC<{ fileId: string; src: string; alt: string }> = ({
  fileId,
  src,
  alt,
}) => {
  console.log('🖼️ ProjectAssetDetail rendering:', { fileId, src, alt });
  
  const [modal, setModal] = React.useState<{
    open: boolean;
    xPercent?: number;
    yPercent?: number;
  }>({ open: false });
  
  const [highlightedCommentId, setHighlightedCommentId] = React.useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], refetch, isLoading } = useQuery({
    queryKey: ["comments", fileId],
    queryFn: () => fetchComments(fileId),
  });

  console.log('🗂️ Comments data:', { comments, isLoading, fileId });

  const mutation = useMutation({
    mutationFn: async (payload: InsertComment) => {
      const response = await fetch(`/api/files/${fileId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["comments", fileId] });
      toast({
        title: "Comment added!",
        description: "Your comment has been saved successfully.",
      });
      setModal({ open: false });
    },
    onError: (error) => {
      console.error("Error creating comment:", error);
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    },
  });



  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ImageWithComments
          src={src}
          alt={alt}
          comments={comments}
          onImageClick={({ xPercent, yPercent }) => {
            console.log('🎯 ProjectAssetDetail received click:', { xPercent, yPercent });
            setModal({ open: true, xPercent, yPercent });
            console.log('🔄 Modal state updated:', { open: true, xPercent, yPercent });
          }}
          onPinClick={commentId => {
            console.log('Pin clicked:', commentId);
            setHighlightedCommentId(commentId);
            // Clear highlight after animation
            setTimeout(() => setHighlightedCommentId(null), 2000);
          }}
          highlightedCommentId={highlightedCommentId}
        />
      )}
      <CommentModal
        open={modal.open}
        onOpenChange={open => {
          console.log('🔄 Modal onOpenChange triggered:', open);
          setModal({ ...modal, open });
        }}
        fileId={fileId}
        xPercent={modal.xPercent}
        yPercent={modal.yPercent}
      />
      {/* Render comment thread UI here if desired */}
    </div>
  );
};