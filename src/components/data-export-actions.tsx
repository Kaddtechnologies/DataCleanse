"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToCSV } from "@/utils/export-utils";

interface DataExportActionsProps {
  onExport: (format: "csv" | "excel") => void;
  hasData: boolean;
}

export function DataExportActions({ onExport, hasData }: DataExportActionsProps) {
  const { toast } = useToast();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Export Processed Data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => onExport('csv')} 
          variant="outline" 
          className="w-full sm:w-auto"
          disabled={!hasData}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
        <Button 
          onClick={() => onExport('excel')} 
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
