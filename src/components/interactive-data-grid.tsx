
"use client";

import type { DuplicatePair } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

interface InteractiveDataGridProps {
  data: DuplicatePair[];
  onReviewPair: (pair: DuplicatePair) => void;
  onUpdatePairStatus: (pairId: string, status: Exclude<DuplicatePair['status'], 'pending'>) => void;
  selectedRowIds: Set<string>;
  onToggleRowSelection: (pairId: string) => void;
  onToggleSelectAll: () => void;
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

const AiConfidenceBadge = ({ confidence }: { confidence?: string }) => {
  if (!confidence) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
  let className = "";

  switch (confidence.toLowerCase()) {
    case 'high':
      badgeVariant = "default";
      className = "bg-green-500 hover:bg-green-600";
      break;
    case 'medium':
      badgeVariant = "secondary";
      className = "bg-yellow-500 hover:bg-yellow-600 text-black"; // Ensure contrast for yellow
      break;
    case 'low':
      badgeVariant = "destructive"; // Using destructive for low for better visual cue
      break;
    case 'error':
      badgeVariant = "destructive";
      className = "bg-red-700 hover:bg-red-800";
      break;
    default: // For any other unexpected values
      badgeVariant = "outline";
  }

  return (
    <Badge variant={badgeVariant} className={className}>
      {confidence}
    </Badge>
  );
};


export function InteractiveDataGrid({ 
  data, 
  onReviewPair, 
  onUpdatePairStatus,
  selectedRowIds,
  onToggleRowSelection,
  onToggleSelectAll 
}: InteractiveDataGridProps) {
  if (!data) { // Added a check for undefined data as well
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Potential Duplicates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading data or no data available.</p>
        </CardContent>
      </Card>
    );
  }
  if (data.length === 0) {
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
  
  const isAllSelected = data.length > 0 && selectedRowIds.size === data.length;

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
                <TableHead className="w-[50px] px-2">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all rows"
                    disabled={data.length === 0}
                  />
                </TableHead>
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
                <TableRow 
                  key={pair.id} 
                  className="hover:bg-muted/50"
                  data-state={selectedRowIds.has(pair.id) ? 'selected' : undefined}
                  onClick={(e) => {
                    // Allow click on row to toggle selection, if not clicking on button/interactive element
                    if (e.target instanceof HTMLElement && !(e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="checkbox"]'))) {
                       onToggleRowSelection(pair.id);
                    }
                  }}
                >
                  <TableCell className="px-2">
                    <Checkbox
                      checked={selectedRowIds.has(pair.id)}
                      onCheckedChange={() => onToggleRowSelection(pair.id)}
                      aria-label={`Select row for pair ${pair.id}`}
                      onClick={(e) => e.stopPropagation()} // Prevent row click from toggling twice
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pair.record1.name}</div>
                    <div className="text-xs text-muted-foreground">{pair.record1.address}</div>
                    <div className="text-xs text-muted-foreground">
                      {pair.record1.city && `${pair.record1.city}, ${pair.record1.country || ''}`}
                      {!pair.record1.city && pair.record1.country}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pair.record1.tpi && <span>TPI: {pair.record1.tpi}</span>}
                      {pair.record1.rowNumber && <span> • Row: {pair.record1.rowNumber}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pair.record2.name}</div>
                    <div className="text-xs text-muted-foreground">{pair.record2.address}</div>
                    <div className="text-xs text-muted-foreground">
                      {pair.record2.city && `${pair.record2.city}, ${pair.record2.country || ''}`}
                      {!pair.record2.city && pair.record2.country}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pair.record2.tpi && <span>TPI: {pair.record2.tpi}</span>}
                      {pair.record2.rowNumber && <span> • Row: {pair.record2.rowNumber}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={pair.similarityScore > 0.8 ? "default" : pair.similarityScore > 0.6 ? "secondary" : "destructive"}
                           className={
                             pair.similarityScore > 0.8 ? "bg-green-500 hover:bg-green-600" : 
                             pair.similarityScore > 0.6 ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "" /* Added text-black for yellow badge contrast */
                            }>
                      {(pair.similarityScore * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <AiConfidenceBadge confidence={pair.aiConfidence} />
                  </TableCell>
                  <TableCell className="text-center">
                     <StatusBadge status={pair.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onReviewPair(pair); }}>
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

    