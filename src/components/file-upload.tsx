
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileProcessed: (file: File) => void;
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const { toast } = useToast();

  const getCSVRowCount = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // A simple line count. Might need adjustment for files with trailing newlines.
        // Subtract 1 if there's a header row and you don't want to count it,
        // but for total lines, this is generally okay.
        const lines = text.split('\n').filter(line => line.trim() !== '').length;
        setRowCount(lines);
      }
    };
    reader.onerror = () => {
      toast({ title: "Error Reading File", description: "Could not read file contents to count rows.", variant: "destructive" });
      setRowCount(null);
    };
    reader.readAsText(csvFile);
  };

  const handleFileSelection = (selectedFile: File | null) => {
    setFile(selectedFile);
    setUploadProgress(0);
    setRowCount(null); // Reset row count when a new file is selected or removed
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv')) {
        getCSVRowCount(selectedFile);
      } else {
        // Optionally, inform the user that row count is only for CSVs
        // toast({ title: "File Type", description: "Row count is only available for CSV files." });
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelection(event.target.files[0]);
      toast({ title: "File Selected", description: event.target.files[0].name });
    } else {
      handleFileSelection(null);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelection(event.dataTransfer.files[0]);
      toast({ title: "File Selected", description: event.dataTransfer.files[0].name });
    }
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleProcessFile = () => {
    if (file) {
      setIsProcessing(true);
      // Simulate file processing
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          onFileProcessed(file);
          // toast({ title: "File Processed", description: `${file.name} is ready for deduplication.`, variant: "default" }); // Moved to page.tsx
        }
      }, 150);
    } else {
       toast({ title: "No File Selected", description: "Please select a file to process.", variant: "destructive" });
    }
  };
  
  useEffect(() => {
    // Reset progress and row count if file is removed
    if (!file) {
      setUploadProgress(0);
      setIsProcessing(false);
      setRowCount(null);
    }
  }, [file]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Upload Customer Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'}
            ${file ? 'bg-green-50 border-green-500' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            onChange={handleFileChange}
            accept=".csv,.xls,.xlsx"
          />
          {file ? (
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-green-600 mb-3" />
              <p className="font-medium text-green-700">{file.name}</p>
              <div className="text-sm text-muted-foreground">
                ({(file.size / 1024).toFixed(2)} KB)
                {rowCount !== null && (
                  <span className="ml-2 flex items-center justify-center">
                    <ScanLine className="w-4 h-4 mr-1 text-muted-foreground" /> {rowCount} rows
                  </span>
                )}
              </div>
              <Button variant="link" size="sm" className="mt-2 text-destructive" onClick={() => handleFileSelection(null)}>
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
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, XLSX up to 10MB</p>
            </>
          )}
        </div>

        {file && uploadProgress > 0 && !isProcessing && uploadProgress === 100 && (
           <div className="flex items-center text-green-600">
             <CheckCircle className="w-5 h-5 mr-2" />
             <p>File ready for processing.</p>
           </div>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">Processing: {uploadProgress}%</p>
          </div>
        )}
        
        <Button 
          onClick={handleProcessFile} 
          disabled={!file || isProcessing || (uploadProgress > 0 && uploadProgress < 100)} 
          className="w-full bg-accent-gradient text-accent-foreground hover:opacity-90 transition-opacity"
        >
          {isProcessing ? 'Processing...' : 'Start Deduplication'}
        </Button>
      </CardContent>
    </Card>
  );
}
