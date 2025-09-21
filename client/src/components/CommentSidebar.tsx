import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";
import { ThreadedCommentList } from "./ThreadedCommentList";
import { CommentModal } from "./CommentModal";
import type { Comment } from "@shared/schema";

interface CommentSidebarProps {
  fileId: string;
  onCommentClick?: (commentId: string) => void;
  highlightedCommentId?: string;
}

export function CommentSidebar({ fileId, onCommentClick, highlightedCommentId }: CommentSidebarProps) {
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["comments", fileId],
    queryFn: async () => {
      const response = await fetch(`/api/files/${fileId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  // Filter to get positioned root comments for count
  const positionedRootComments = comments
    .filter(comment => !comment.parentId && comment.positionX !== null && comment.positionY !== null);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({positionedRootComments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-full max-h-[600px]">
            <ThreadedCommentList
              comments={comments}
              fileId={fileId}
              onCommentClick={onCommentClick}
              highlightedCommentId={highlightedCommentId}
              onReply={(comment) => setReplyTarget(comment)}
            />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reply Modal - triggered by clicking Reply on any comment */}
      <CommentModal
        open={!!replyTarget}
        onOpenChange={(open) => !open && setReplyTarget(null)}
        fileId={fileId}
        parentId={replyTarget?.id || undefined}
        replyToComment={replyTarget}
      />
    </>
  );
}