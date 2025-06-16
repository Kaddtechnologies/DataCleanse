"use client";

import { useState } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSessionPersistence } from '@/hooks/use-session-persistence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiAnalysisDisplay } from './ai-analysis-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, SkipForwardIcon, User, Mail, Phone, MapPin, CheckCircle, Minus, AlertCircle } from 'lucide-react';
import { isInvalidNameRecord, getDisplayName, getInvalidNameReason, compareRecords, compareValues } from '@/utils/record-validation';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';
import { RowComparisonDialog } from '@/components/row-comparison-dialog';

interface CardReviewModalProps {
  pair: DuplicatePair | null;
  recordName?: string;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (pairId: string, recordName: string, resolution: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => void;
  onAnalyzeConfidence?: (record1: Record<string, string>, record2: Record<string, string>, fuzzyScore: number) => Promise<any>;
  onEnhancedAnalysisComplete?: (pairId: string, enhancedResults: {
    enhancedConfidence: string;
    enhancedScore: number;
    originalScore: number;
    scoreChangeReason: string;
    lastAnalyzed: string;
  }) => void;
  onCacheAnalysis?: (pairId: string, analysis: any) => void;
  sessionId?: string;
  onSessionStatsChanged?: () => void;
}

const RecordDetail = ({ icon: Icon, label, value, showIfEmpty = false }: {
  icon: React.ElementType,
  label: string,
  value?: string | number | null,
  showIfEmpty?: boolean
}) => {
  if (!value && !showIfEmpty) return null;
  
  return (
    <div className="flex items-start space-x-2 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <span className="font-medium text-muted-foreground">{label}: </span>
        <span>{value !== undefined && value !== null ? String(value) : "N/A"}</span>
      </div>
    </div>
  );
};

const DiffRecordDetail = ({ 
  icon: Icon, 
  label, 
  value, 
  comparisonType, 
  comparisonNote,
  similarity,
  showIfEmpty = false,
  fieldName
}: {
  icon: React.ElementType,
  label: string,
  value?: string | number | null,
  comparisonType: 'identical' | 'different' | 'similar' | 'one-empty' | 'both-empty',
  comparisonNote?: string,
  similarity?: number,
  showIfEmpty?: boolean,
  fieldName?: string
}) => {
  if (!value && !showIfEmpty && comparisonType !== 'one-empty') return null;
  
  // Don't highlight TPI and Row Number fields
  const shouldHighlight = fieldName && !['tpi', 'rowNumber'].includes(fieldName);
  
  const getIndicatorIcon = () => {
    if (!shouldHighlight) return null;
    
    switch (comparisonType) {
      case 'identical':
        return <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case 'similar':
        return <AlertCircle className="w-3 h-3 text-amber-500" />;
      case 'different':
        return <Minus className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />;
      case 'one-empty':
        return <Minus className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };
  
  const getContainerStyles = () => {
    if (!shouldHighlight) return "";
    
    switch (comparisonType) {
      case 'identical':
        return "bg-green-50 dark:bg-green-950/20 border-l-2 border-green-200 dark:border-green-800 pl-3 py-1 rounded-r";
      case 'similar':
        return "bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-200 dark:border-amber-800 pl-3 py-1 rounded-r";
      case 'different':
        return "bg-yellow-50 dark:bg-yellow-950/20 border-l-2 border-yellow-200 dark:border-yellow-800 pl-3 py-1 rounded-r";
      case 'one-empty':
        return "bg-gray-50 dark:bg-gray-950/20 border-l-2 border-gray-200 dark:border-gray-800 pl-3 py-1 rounded-r";
      default:
        return "";
    }
  };
  
  return (
    <div className={`flex items-start space-x-2 text-sm ${getContainerStyles()}`}>
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">{label}: </span>
          {getIndicatorIcon()}
        </div>
        <div className="mt-0.5">
          <span className="break-words text-foreground">{value !== undefined && value !== null ? String(value) : "N/A"}</span>
          {comparisonNote && shouldHighlight && (
            <span className="text-xs text-muted-foreground ml-2">({comparisonNote})</span>
          )}
          {similarity && shouldHighlight && (
            <span className="text-xs text-muted-foreground ml-2">
              ({Math.round(similarity * 100)}% similar)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomerRecordCard = ({ 
  record, 
  title, 
  comparisons,
  isComparing = false,
  onRowNumberClick
}: { 
  record: CustomerRecord, 
  title: string,
  comparisons?: Record<string, ReturnType<typeof compareValues>>,
  isComparing?: boolean,
  onRowNumberClick?: (rowNumber: number | undefined) => void
}) => {
  const isInvalid = isInvalidNameRecord(record);
  
  // Choose which RecordDetail component to use based on comparison mode
  const DetailComponent = isComparing && comparisons ? DiffRecordDetail : RecordDetail;
  
  return (
    <Card className={`relative bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden ${isInvalid ? 'border-l-4 border-red-500' : ''}`}>
      {/* Executive Card Header */}
      <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`text-lg font-medium tracking-wide ${isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {title}
                {isInvalid && (
                  <span className="ml-2 text-sm font-normal text-red-500">(Data Quality Issue)</span>
                )}
              </CardTitle>
              <CardDescription className="text-base font-light mt-1 text-slate-600 dark:text-slate-400">
                {record.name}
                {isInvalid && (
                  <span className="ml-2 text-sm text-red-500 dark:text-red-400">(requires attention)</span>
                )}
              </CardDescription>
            </div>
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
          </div>
        
          {/* Executive Data Quality Alert */}
          {isInvalid && (
            <div className="mt-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="text-red-800 dark:text-red-200 font-semibold">Data Quality Alert</p>
                  <p className="text-red-700 dark:text-red-300 mt-1 leading-relaxed">{getInvalidNameReason(record)}</p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </div>
      <CardContent className="space-y-3">
        {/* Basic Information Section */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          {isComparing && comparisons ? (
            <>
              <DiffRecordDetail 
                icon={User} 
                label="Name" 
                value={record.name} 
                comparisonType={comparisons.name?.type || 'different'}
                comparisonNote={comparisons.name?.note}
                similarity={comparisons.name?.similarity}
                fieldName={comparisons.name?.fieldName}
              />
              <DiffRecordDetail 
                icon={MapPin} 
                label="Address" 
                value={record.address} 
                comparisonType={comparisons.address?.type || 'different'}
                comparisonNote={comparisons.address?.note}
                similarity={comparisons.address?.similarity}
                fieldName={comparisons.address?.fieldName}
              />
              <DiffRecordDetail 
                icon={MapPin} 
                label="City" 
                value={record.city} 
                comparisonType={comparisons.city?.type || 'different'}
                comparisonNote={comparisons.city?.note}
                similarity={comparisons.city?.similarity}
                fieldName={comparisons.city?.fieldName}
                showIfEmpty={true} 
              />
              <DiffRecordDetail 
                icon={MapPin} 
                label="Country" 
                value={record.country} 
                comparisonType={comparisons.country?.type || 'different'}
                comparisonNote={comparisons.country?.note}
                fieldName={comparisons.country?.fieldName}
                showIfEmpty={true} 
              />
              <DiffRecordDetail 
                icon={InfoIcon} 
                label="TPI Number" 
                value={record.tpi} 
                comparisonType={comparisons.tpi?.type || 'different'}
                comparisonNote={comparisons.tpi?.note}
                fieldName={comparisons.tpi?.fieldName}
                showIfEmpty={true} 
              />
              <div className="flex items-start space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors" onClick={() => onRowNumberClick?.(record.rowNumber)} title="Click to view row in Excel-like format">
                <InfoIcon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">Row Number: </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="break-words text-primary hover:underline">{record.rowNumber !== undefined && record.rowNumber !== null ? String(record.rowNumber) : "N/A"}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <RecordDetail icon={User} label="Name" value={record.name} />
              <RecordDetail icon={MapPin} label="Address" value={record.address} />
              <RecordDetail icon={MapPin} label="City" value={record.city} showIfEmpty={true} />
              <RecordDetail icon={MapPin} label="Country" value={record.country} showIfEmpty={true} />
              <RecordDetail icon={InfoIcon} label="TPI Number" value={record.tpi} showIfEmpty={true} />
              <div className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors" onClick={() => onRowNumberClick?.(record.rowNumber)} title="Click to view row in Excel-like format">
                <InfoIcon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="font-medium text-muted-foreground">Row Number: </span>
                  <span className="text-primary hover:underline">{record.rowNumber !== undefined && record.rowNumber !== null ? String(record.rowNumber) : "N/A"}</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Similarity Scores Section */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Similarity Scores</h3>
          <RecordDetail icon={PercentIcon} label="Name Score" value={record.name_score} showIfEmpty={true} />
          <RecordDetail icon={PercentIcon} label="Address Score" value={record.addr_score} showIfEmpty={true} />
          <RecordDetail icon={PercentIcon} label="City Score" value={record.city_score} showIfEmpty={true} />
          <RecordDetail icon={PercentIcon} label="Country Score" value={record.country_score} showIfEmpty={true} />
          <RecordDetail icon={PercentIcon} label="TPI Score" value={record.tpi_score} showIfEmpty={true} />
          <RecordDetail icon={PercentIcon} label="Overall Score" value={record.overall_score} showIfEmpty={true} />
        </div>
        
        {/* Match Method Information Section */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Match Method Information</h3>
          <RecordDetail icon={BlockIcon} label="Block Type" value={record.blockType} showIfEmpty={true} />
          <RecordDetail icon={MethodIcon} label="Match Method" value={record.matchMethod} showIfEmpty={true} />
          <RecordDetail icon={MethodIcon} label="Best Name Match Method" value={record.bestNameMatchMethod} showIfEmpty={true} />
          <RecordDetail icon={MethodIcon} label="Best Address Match Method" value={record.bestAddrMatchMethod} showIfEmpty={true} />
        </div>
        
        {/* Confidence Information Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Confidence Information</h3>
          <RecordDetail
            icon={ConfidenceIcon}
            label="Low Confidence"
            value={record.isLowConfidence !== undefined ? (record.isLowConfidence ? "Yes" : "No") : null}
            showIfEmpty={false}
          />
          <RecordDetail icon={ConfidenceIcon} label="LLM Confidence" value={record.llm_conf} showIfEmpty={false} />
          
          {/* Display any other fields not explicitly handled */}
          {Object.entries(record)
            .filter(([key]) => ![
              'id', 'name', 'email', 'phone', 'address', 'city', 'country', 'tpi', 'rowNumber',
              'name_score', 'addr_score', 'city_score', 'country_score', 'tpi_score', 'overall_score',
              'isLowConfidence', 'blockType', 'matchMethod', 'bestNameMatchMethod', 'bestAddrMatchMethod', 'llm_conf'
            ].includes(key))
            .map(([key, value]) => (
              <RecordDetail
                key={key}
                icon={InfoIcon}
                label={key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                value={value}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Percent icon for similarity scores
const PercentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="19" y1="5" x2="5" y2="19"></line>
    <circle cx="6.5" cy="6.5" r="2.5"></circle>
    <circle cx="17.5" cy="17.5" r="2.5"></circle>
  </svg>
);

// Placeholder for a generic info icon if needed
const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

// Block icon for block type
const BlockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

// Method icon for match methods
const MethodIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

// Confidence icon for confidence information
const ConfidenceIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
);

// Legend component for diff highlighting
const DiffLegend = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
    <span className="font-medium text-foreground">Field Comparison:</span>
    <div className="flex items-center gap-1">
      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
      <span>Identical</span>
    </div>
    <div className="flex items-center gap-1">
      <Minus className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
      <span>Different</span>
    </div>
    <div className="flex items-center gap-1">
      <AlertCircle className="w-3 h-3 text-amber-500" />
      <span>Similar</span>
    </div>
  </div>
);

export function CardReviewModal({ 
  pair, 
  recordName, 
  isOpen, 
  onClose, 
  onResolve, 
  onAnalyzeConfidence,
  onEnhancedAnalysisComplete,
  onCacheAnalysis,
  sessionId,
  onSessionStatsChanged
}: CardReviewModalProps) {
  if (!pair) return null;
  
  // Row comparison dialog state
  const [showRowComparison, setShowRowComparison] = useState(false);
  const [comparisonRowNumbers, setComparisonRowNumbers] = useState<number[]>([]);

  // Database persistence
  const { updateDuplicatePair } = useSessionPersistence();
  
  // Enhanced resolve handler that saves to database
  const handleResolve = async (pairId: string, recordName: string, resolution: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => {
    // Update local state first for immediate UI feedback
    onResolve(pairId, recordName, resolution);
    
    // Save to database
    try {
      await updateDuplicatePair(pairId, { status: resolution });
      // Trigger session stats refresh
      if (onSessionStatsChanged) {
        onSessionStatsChanged();
      }
    } catch (error) {
      console.error('Failed to save decision to database:', error);
      // Could show a toast notification here for failed saves
    }
  };
  
  // Enhanced AI analysis complete handler that caches to database
  const handleEnhancedAnalysisComplete = async (results: {
    enhancedConfidence: string;
    enhancedScore: number;
    originalScore: number;
    scoreChangeReason: string;
    lastAnalyzed: string;
  }) => {
    // Update local state first
    if (onEnhancedAnalysisComplete) {
      onEnhancedAnalysisComplete(pair.id, results);
    }
    
    // Save enhanced analysis to database
    try {
      await updateDuplicatePair(pair.id, {
        enhancedConfidence: results.enhancedConfidence,
        enhancedScore: results.enhancedScore
      });
    } catch (error) {
      console.error('Failed to save enhanced analysis to database:', error);
    }
  };
  
  // Enhanced cache analysis handler that saves to database
  const handleCacheAnalysis = async (analysis: any) => {
    // Update local state first
    if (onCacheAnalysis) {
      onCacheAnalysis(pair.id, analysis);
    }
    
    // Save cached analysis to database
    try {
      await updateDuplicatePair(pair.id, {
        cachedAiAnalysis: analysis
      });
    } catch (error) {
      console.error('Failed to cache analysis to database:', error);
    }
  };

  // Calculate comparisons between the two records
  const comparisons = compareRecords(pair.record1, pair.record2);
  
  // Handle row number clicks for comparison
  const handleRowNumberClick = (rowNumbers: (number | undefined)[]) => {
    const validRowNumbers = rowNumbers.filter((num): num is number => 
      num !== undefined && num !== null && !isNaN(num)
    );
    
    if (validRowNumbers.length > 0 && sessionId) {
      setComparisonRowNumbers(validRowNumbers);
      setShowRowComparison(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        {/* Executive Header */}
        <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-300 dark:border-slate-600">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/5 to-blue-900/10" />
          <div className="relative px-8 py-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light text-white tracking-wide">
                Duplicate Record Analysis
              </DialogTitle>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-white/80 font-light">
                  Executive review and decision interface for data quality management
                </p>
                <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-white/90 tracking-wide">SIMILARITY</span>
                  </div>
                  <div className="w-px h-4 bg-white/30" />
                  <span className="text-lg font-semibold text-white">{(pair.similarityScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            </DialogHeader>
          </div>
        </div>
        
        <ScrollArea className="max-h-[75vh]">
          <div className="p-8 space-y-8">
            
            {/* Executive Field Comparison Legend */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 tracking-wide">Data Comparison Matrix</h3>
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">Identical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-sm" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">Similar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">Different</span>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <CustomerRecordCard 
                  record={pair.record1} 
                  title="Primary Record" 
                  comparisons={comparisons}
                  isComparing={true}
                  onRowNumberClick={(rowNumber) => handleRowNumberClick([rowNumber])}
                />
                <CustomerRecordCard 
                  record={pair.record2} 
                  title="Comparison Record" 
                  comparisons={comparisons}
                  isComparing={true}
                  onRowNumberClick={(rowNumber) => handleRowNumberClick([rowNumber])}
                />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

            <AiAnalysisDisplay 
              record1={pair.record1} 
              record2={pair.record2} 
              fuzzyScore={pair.similarityScore}
              analyzeFunction={onAnalyzeConfidence}
              onAnalysisComplete={handleEnhancedAnalysisComplete}
              cachedAnalysis={pair.cachedAiAnalysis}
              onCacheAnalysis={handleCacheAnalysis}
            />

            {/* Executive Decision Interface */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 tracking-wide mb-6">Executive Decision</h3>
              
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <button
                  onClick={() => handleResolve(pair.id, pair.record1.name, 'skipped')}
                  className="group px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <SkipForwardIcon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 tracking-wide">Defer Decision</span>
                </button>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                  <button
                    onClick={() => handleResolve(pair.id, pair.record1.name, 'not_duplicate')}
                    className="group px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border border-red-600 transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
                  >
                    <X className="w-5 h-5" />
                    <span className="font-semibold tracking-wide">Separate Records</span>
                  </button>
                  
                  <button
                    onClick={() => handleResolve(pair.id, pair.record1.name, 'duplicate')}
                    className="group px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-600 transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
                  >
                    <Check className="w-5 h-5" />
                    <span className="font-semibold tracking-wide">Confirm Duplicate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
{/*         
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 z-50 text-white/80 hover:text-white hover:bg-white/10 transition-colors" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose> */}
      </DialogContent>
      
      {/* Row Comparison Dialog */}
      <RowComparisonDialog
        isOpen={showRowComparison}
        onClose={() => setShowRowComparison(false)}
        rowNumbers={comparisonRowNumbers}
        sessionId={sessionId || ''}
        title="Record Row Comparison"
        fallbackRecords={[pair.record1, pair.record2]}
      />
    </Dialog>
  );
}
