import { FileRecord, getFileType } from "@/lib/types";
import { FileText, File, Video, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  file: FileRecord;
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {
  const fileType = getFileType(file.mimeType);

  const getFileUrl = (objectPath: string) => {
    return objectPath.startsWith('/objects/') ? objectPath : `/objects/${objectPath}`;
  };

  switch (fileType) {
    case 'image':
      return (
        <img
          src={getFileUrl(file.objectPath)}
          alt={file.originalName}
          className={cn("object-cover", className)}
          loading="lazy"
        />
      );
    
    case 'video':
      return (
        <div className={cn("bg-slate-900 flex items-center justify-center relative", className)}>
          <video
            src={getFileUrl(file.objectPath)}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
              <Video className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        </div>
      );
    
    case 'pdf':
      return (
        <div className={cn("bg-red-50 flex flex-col items-center justify-center", className)}>
          <FileText className="w-8 h-8 text-red-500 mb-2" />
          <span className="text-xs text-red-600 font-medium">PDF</span>
        </div>
      );
    
    default:
      return (
        <div className={cn("bg-slate-50 flex flex-col items-center justify-center", className)}>
          <File className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-xs text-slate-600 font-medium">FILE</span>
        </div>
      );
  }
}
