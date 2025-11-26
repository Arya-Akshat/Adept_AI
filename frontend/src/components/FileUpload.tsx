import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  disabled?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  disabled,
  className,
}) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        'relative rounded-lg border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-medium">Drop your file here or click to browse</p>
        <p className="text-xs text-muted-foreground">Supported formats: {accept}</p>
      </div>
    </div>
  );
};
