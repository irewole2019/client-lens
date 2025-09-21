import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommentModal } from "./CommentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { Comment, File } from "@shared/schema";

interface PDFWithCommentsProps {
  file: File;
  isPublic?: boolean;
  onCommentClick?: (commentId: string) => void;
  highlightedCommentId?: string;
}

export function PDFWithComments({ 
  file, 
  isPublic = false, 
  onCommentClick,
  highlightedCommentId 
}: PDFWithCommentsProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], refetch } = useQuery<Comment[]>({
    queryKey: ["comments", file.id],
    queryFn: async () => {
      const response = await fetch(`/api/files/${file.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: isPublic, // Only fetch comments on public pages
  });

  // Get root comments for current page, sorted by creation date
  const rootCommentsForPage = comments
    .filter(comment => 
      !comment.parentId && 
      comment.page === currentPage &&
      comment.positionX !== null && 
      comment.positionY !== null
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Get all root comments to determine pin numbers
  const allRootComments = comments
    .filter(comment => !comment.parentId && comment.page !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handlePDFClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPublic) return; // Only allow commenting on public pages
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    setNewCommentPosition({ x, y, page: currentPage });
    setSelectedPinIndex(null);
    setShowModal(true);
  };

  const handlePinClick = (comment: Comment) => {
    const globalIndex = allRootComments.findIndex(c => c.id === comment.id);
    setSelectedPinIndex(globalIndex);
    setNewCommentPosition(null);
    setShowModal(true);
    onCommentClick?.(comment.id);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPinIndex(null);
    setNewCommentPosition(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* PDF viewer with page controls */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm px-3">
            Page {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF page display area */}
      <div className="relative group">
        <div
          ref={containerRef}
          className={`w-full bg-white dark:bg-gray-900 border rounded-lg shadow-sm min-h-[600px] flex items-center justify-center relative ${
            isPublic ? 'cursor-crosshair' : ''
          }`}
          onClick={handlePDFClick}
        >
          {/* PDF page placeholder */}
          <div className="text-center p-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              PDF Page {currentPage}
            </h3>
            <p className="text-sm text-gray-500">
              {file.name}
            </p>
            {isPublic && (
              <p className="text-xs text-gray-400 mt-2">
                Click anywhere to add a comment annotation
              </p>
            )}
          </div>

          {isPublic && (
            <>
              {/* Overlay hint */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium">
                  Click to add comment
                </div>
              </div>

              {/* Comment pins for current page */}
              {rootCommentsForPage.map((comment) => {
                const globalIndex = allRootComments.findIndex(c => c.id === comment.id);
                return (
                  <div
                    key={comment.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 ${
                      highlightedCommentId === comment.id ? 'animate-pulse' : ''
                    }`}
                    style={{
                      left: `${comment.positionX}%`,
                      top: `${comment.positionY}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(comment);
                    }}
                  >
                    <Badge 
                      variant="default" 
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        bg-blue-600 text-white border-2 border-white shadow-lg
                        hover:bg-blue-700 hover:scale-110 transition-all duration-200
                        ${highlightedCommentId === comment.id ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      `}
                    >
                      {globalIndex + 1}
                    </Badge>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {isPublic && (
          <CommentModal
            isOpen={showModal}
            onClose={handleModalClose}
            fileId={file.id}
            positionX={newCommentPosition?.x}
            positionY={newCommentPosition?.y}
            page={newCommentPosition?.page}
            existingComment={selectedPinIndex !== null ? allRootComments[selectedPinIndex] : undefined}
            onSuccess={handleModalClose}
          />
        )}
      </div>
    </div>
  );
}