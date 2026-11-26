import { useCallback } from "react";
import { toast } from "sonner";

interface UseMarkdownFileUploadOptions {
  onContentLoaded: (content: string) => void;
  onFilenameLoaded: (filename: string) => void;
  onDesktopDocumentLoaded: (
    content: string,
    filename: string,
    id: string,
  ) => void;
}

export function getBaseFilename(inputFilename: string): string {
  return inputFilename.replace(/\.[^/.]+$/, "") || "document";
}

function isMarkdownFilename(inputFilename: string): boolean {
  return /\.(md|markdown)$/i.test(inputFilename);
}

export function useMarkdownFileUpload({
  onContentLoaded,
  onFilenameLoaded,
  onDesktopDocumentLoaded,
}: UseMarkdownFileUploadOptions) {
  const handleUploadMarkdownFile = useCallback(
    async (file: File) => {
      if (!isMarkdownFilename(file.name)) {
        toast.error("Please upload a .md or .markdown file.");
        return false;
      }

      try {
        const desktop = window.drymdfDesktop;
        if (desktop) {
          const { content, id, name } = await desktop.openMarkdown(file);
          onDesktopDocumentLoaded(content, getBaseFilename(name), id);
        } else {
          const uploadedContent = await file.text();
          onContentLoaded(uploadedContent);
          onFilenameLoaded(getBaseFilename(file.name));
        }
        toast.success(`Loaded ${file.name}`);
        return true;
      } catch {
        toast.error("Failed to read the selected file.");
        return false;
      }
    },
    [onContentLoaded, onFilenameLoaded, onDesktopDocumentLoaded],
  );

  return {
    handleUploadMarkdownFile,
  };
}
