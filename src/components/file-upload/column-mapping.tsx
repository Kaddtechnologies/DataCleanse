"use client";

import { CheckCircle, X, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollapsibleSection } from './collapsible-section';
import { LOGICAL_FIELDS } from '@/lib/canonical-field-mapping';

interface ColumnMappingProps {
  columnHeaders: string[];
  columnMap: Record<string, string>;
  onColumnMapChange: (columnMap: Record<string, string>) => void;
  isLoading?: boolean;
}

export function ColumnMapping({ 
  columnHeaders, 
  columnMap, 
  onColumnMapChange, 
  isLoading = false 
}: ColumnMappingProps) {
  const updateColumnMap = (field: string, value: string) => {
    onColumnMapChange({ 
      ...columnMap, 
      [field]: value === "unmapped" ? "" : value 
    });
  };

  return (
    <CollapsibleSection 
      title="Column Mapping" 
      defaultOpen={true}
      variant="compact"
      id="column-mapping"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOGICAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2" id={`${field.key}-mapping`}>
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Select
                onValueChange={(value) => updateColumnMap(field.key, value)}
                value={columnMap[field.key] || "unmapped"}
                disabled={isLoading}
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmapped">Unmapped</SelectItem>
                  {columnHeaders.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Auto-Mapping Feedback Section */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
            Auto-Mapping Results
          </h4>
          <div className="space-y-2">
            {LOGICAL_FIELDS.map((field) => {
              const mappedHeader = columnMap[field.key];
              const isRequired = field.required;
              
              return (
                <div key={field.key} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    {field.label}
                    {isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                  </span>
                  <div className="flex items-center">
                    {mappedHeader ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400 mr-1" />
                        <span className="text-green-700 dark:text-green-400 font-medium">"{mappedHeader}"</span>
                      </>
                    ) : (
                      <>
                        {isRequired ? (
                          <>
                            <X className="w-3 h-3 text-red-500 dark:text-red-400 mr-1" />
                            <span className="text-red-600 dark:text-red-400">Required - Please map</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 rounded-full bg-muted mr-1"></div>
                            <span className="text-muted-foreground">Not mapped</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary feedback */}
          <div className="pt-2 border-t border-border">
            {(() => {
              const mappedCount = Object.values(columnMap).filter(Boolean).length;
              const requiredMappedCount = LOGICAL_FIELDS.filter(field => 
                field.required && columnMap[field.key]
              ).length;
              const totalRequired = LOGICAL_FIELDS.filter(field => field.required).length;
              
              if (requiredMappedCount === totalRequired && mappedCount >= 2) {
                return (
                  <div className="text-xs text-green-700 dark:text-green-400 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready to process! {mappedCount} field{mappedCount !== 1 ? 's' : ''} mapped.
                  </div>
                );
              } else if (requiredMappedCount < totalRequired) {
                return (
                  <div className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    Please map all required fields to continue.
                  </div>
                );
              } else {
                return (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                    <HelpCircle className="w-3 h-3 mr-1" />
                    Map at least 2 fields to start deduplication.
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}