import { useCallback } from "react";
import { toast } from "sonner";

interface UseMarkdownFileUploadOptions {
  onContentLoaded: (content: string) => void;
  onFilenameLoaded: (filename: string) => void;
}

function getBaseFilename(inputFilename: string): string {
  return inputFilename.replace(/\.[^/.]+$/, "") || "document";
}

function isMarkdownFilename(inputFilename: string): boolean {
  return /\.(md|markdown)$/i.test(inputFilename);
}

export function useMarkdownFileUpload({
  onContentLoaded,
  onFilenameLoaded,
}: UseMarkdownFileUploadOptions) {
  const handleUploadMarkdownFile = useCallback(
    async (file: File) => {
      if (!isMarkdownFilename(file.name)) {
        toast.error("Please upload a .md or .markdown file.");
        return;
      }

      try {
        const uploadedContent = await file.text();
        onContentLoaded(uploadedContent);
        onFilenameLoaded(getBaseFilename(file.name));
        toast.success(`Loaded ${file.name}`);
      } catch {
        toast.error("Failed to read the selected file.");
      }
    },
    [onContentLoaded, onFilenameLoaded],
  );

  return {
    handleUploadMarkdownFile,
  };
}
