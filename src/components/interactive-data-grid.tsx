
"use client";

import type { DuplicatePair } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle } from 'lucide-react';

interface InteractiveDataGridProps {
  data: DuplicatePair[];
  onReviewPair: (pair: DuplicatePair) => void;
  onUpdatePairStatus: (pairId: string, status: DuplicatePair['status']) => void;
}

const StatusBadge = ({ status }: { status: DuplicatePair['status'] }) => {
  switch (status) {
    case 'merged':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Merged</Badge>;
    case 'not_duplicate':
      return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Not Duplicate</Badge>;
    case 'skipped':
      return <Badge variant="outline"><SkipForward className="w-3 h-3 mr-1" /> Skipped</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
  }
};


export function InteractiveDataGrid({ data, onReviewPair, onUpdatePairStatus }: InteractiveDataGridProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Potential Duplicates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No duplicate pairs found or data not yet processed.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Potential Duplicates Review</CardTitle>
        <p className="text-sm text-muted-foreground">
          Found {data.length} potential duplicate {data.length === 1 ? 'pair' : 'pairs'}. Review the list identified by the system.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record 1</TableHead>
                <TableHead>Record 2</TableHead>
                <TableHead className="text-center">Similarity</TableHead>
                <TableHead className="text-center">AI Confidence</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pair) => (
                <TableRow key={pair.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{pair.record1.name}</div>
                    <div className="text-xs text-muted-foreground">{pair.record1.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pair.record2.name}</div>
                    <div className="text-xs text-muted-foreground">{pair.record2.email}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={pair.similarityScore > 0.8 ? "default" : pair.similarityScore > 0.6 ? "secondary" : "destructive"}
                           className={pair.similarityScore > 0.8 ? "bg-green-500 hover:bg-green-600" : pair.similarityScore > 0.6 ? "bg-yellow-500 hover:bg-yellow-600" : ""}>
                      {(pair.similarityScore * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {pair.aiConfidence ? (
                      <Badge variant={
                        pair.aiConfidence.toLowerCase() === 'high' ? 'default' : 
                        pair.aiConfidence.toLowerCase() === 'medium' ? 'secondary' : 'outline'
                      }
                      className={
                        pair.aiConfidence.toLowerCase() === 'high' ? "bg-green-500 hover:bg-green-600" : 
                        pair.aiConfidence.toLowerCase() === 'medium' ? "bg-yellow-500 hover:bg-yellow-600" : ""
                      }
                      >
                        {pair.aiConfidence}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                     <StatusBadge status={pair.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onReviewPair(pair)}>
                      <Eye className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Review</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
