import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageCircle, Play, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentModal } from "./CommentModal";
import type { Comment, File } from "@shared/schema";

interface VideoWithCommentsProps {
  file: File;
  isPublic?: boolean;
}

export function VideoWithComments({ file, isPublic = false }: VideoWithCommentsProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: comments = [], refetch } = useQuery<Comment[]>({
    queryKey: ["/api/files", file.id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/files/${file.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: isPublic,
  });

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAddComment = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowModal(true);
    }
  };

  const jumpToTime = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "To Do": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "In Progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Sort comments by timestamp
  const timestampComments = comments
    .filter(c => c.timestamp !== null && !c.parentId)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const getReplies = (commentId: string) => comments.filter(c => c.parentId === commentId);

  return (
    <div className="space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={!isPublic}
        >
          <source src={file.objectPath} type={file.mimeType} />
          Your browser does not support the video tag.
        </video>
        
        {isPublic && (
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm">
                  {formatTime(currentTime)}
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleAddComment}
                className="flex items-center space-x-1"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Add Comment</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {isPublic && timestampComments.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Comments Timeline</h4>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {timestampComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  return (
                    <div key={comment.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => jumpToTime(comment.timestamp || 0)}
                            className="text-blue-600 hover:text-blue-800 p-0 h-auto font-mono"
                          >
                            {formatTime(comment.timestamp || 0)}
                          </Button>
                          <Badge className={getTagColor(comment.tag)}>
                            {comment.tag}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-2">
                        <p className="font-medium text-sm">{comment.name}</p>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                        
                        {replies.length > 0 && (
                          <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                            {replies.map((reply) => (
                              <div key={reply.id}>
                                <p className="font-medium text-sm">{reply.name}</p>
                                <p className="text-sm">{reply.content}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <CommentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fileId={file.id}
        timestamp={Math.floor(currentTime)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}