"use client";

import { ChangeEvent, DragEvent, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, FileText, ScanLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FileUploadDisplayProps {
  file: File | null;
  isDragging: boolean;
  rowCount: number | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onFileRemove: () => void;
}

export function FileUploadDisplay({
  file,
  isDragging,
  rowCount,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileRemove
}: FileUploadDisplayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = useCallback((size: number) => {
    return size > 1024 * 1024 
      ? `${(size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(size / 1024).toFixed(2)} KB`;
  }, []);

  // Clear file input when file is removed
  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [file]);

  const handleFileRemove = useCallback(() => {
    // Clear the file input before calling the parent's onFileRemove
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove();
  }, [onFileRemove]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Upload Customer Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'}
            ${file ? 'bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-600' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            onChange={onFileChange}
            accept=".csv,.xls,.xlsx"
            ref={fileInputRef}
          />
          {file ? (
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-3" />
              <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
              <div className="text-sm text-muted-foreground">
                ({formatFileSize(file.size)})
                {rowCount !== null && (
                  <span className="ml-2 flex items-center justify-center">
                    <ScanLine className="w-4 h-4 mr-1 text-muted-foreground" /> {rowCount} rows
                  </span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" 
                onClick={handleFileRemove}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove file
              </Button>
            </div>
          ) : (
            <>
              <UploadCloud className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <label htmlFor="fileUpload" className="font-medium text-primary cursor-pointer hover:underline">
                Choose a file
              </label>
              <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, XLSX up to 100MB</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}