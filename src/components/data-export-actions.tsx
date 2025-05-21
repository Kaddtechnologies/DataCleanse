"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToCSV } from "@/utils/export-utils";

interface DataExportActionsProps {
  data: any[];
  hasData: boolean;
}

export function DataExportActions({ data, hasData }: DataExportActionsProps) {
  const { toast } = useToast();

  const handleExportClick = (format: 'csv' | 'excel') => {
    if (!hasData || !data || data.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please process a file first to generate data for export.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (format === 'excel') {
        exportToExcel(data, 'processed-data');
      } else {
        exportToCSV(data, 'processed-data');
      }

      toast({
        title: "Export Successful",
        description: `Data has been exported to ${format.toUpperCase()} format.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the data.",
        variant: "destructive",
      });
    }
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
