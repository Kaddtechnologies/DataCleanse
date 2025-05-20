"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface DataExportActionsProps {
  onExport: (format: 'csv' | 'excel') => void;
  hasData: boolean;
}

export function DataExportActions({ onExport, hasData }: DataExportActionsProps) {
  const { toast } = useToast();

  const handleExportClick = (format: 'csv' | 'excel') => {
    if (!hasData) {
      toast({
        title: "No Data to Export",
        description: "Please process a file first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    onExport(format);
    toast({
      title: "Export Started (Mock)",
      description: `Data export to ${format.toUpperCase()} has been initiated.`,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Export Processed Data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => handleExportClick('csv')} 
          variant="outline" 
          className="w-full sm:w-auto"
          disabled={!hasData}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
        <Button 
          onClick={() => handleExportClick('excel')} 
          variant="outline" 
          className="w-full sm:w-auto"
          disabled={!hasData}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </CardContent>
    </Card>
  );
}
