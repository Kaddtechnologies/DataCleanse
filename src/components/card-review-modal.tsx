"use client";

import type { DuplicatePair, CustomerRecord } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiAnalysisDisplay } from './ai-analysis-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, SkipForwardIcon, User, Mail, Phone, MapPin } from 'lucide-react';

interface CardReviewModalProps {
  pair: DuplicatePair | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (pairId: string, resolution: 'merged' | 'not_duplicate' | 'skipped') => void;
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

const CustomerRecordCard = ({ record, title }: { record: CustomerRecord, title: string }) => (
  <Card className="flex-1 min-w-[300px] shadow-md">
    <CardHeader>
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription>{record.name}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* Basic Information Section */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>
        <RecordDetail icon={User} label="Name" value={record.name} />
        <RecordDetail icon={MapPin} label="Address" value={record.address} />
        <RecordDetail icon={MapPin} label="City" value={record.city} showIfEmpty={true} />
        <RecordDetail icon={MapPin} label="Country" value={record.country} showIfEmpty={true} />
        <RecordDetail icon={InfoIcon} label="TPI Number" value={record.tpi} showIfEmpty={true} />
        <RecordDetail icon={InfoIcon} label="Row Number" value={record.rowNumber} showIfEmpty={true} />
      </div>
      
      {/* Similarity Scores Section */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-semibold">Similarity Scores</h3>
        <RecordDetail icon={PercentIcon} label="Name Score" value={record.name_score} showIfEmpty={true} />
        <RecordDetail icon={PercentIcon} label="Address Score" value={record.addr_score} showIfEmpty={true} />
        <RecordDetail icon={PercentIcon} label="City Score" value={record.city_score} showIfEmpty={true} />
        <RecordDetail icon={PercentIcon} label="Country Score" value={record.country_score} showIfEmpty={true} />
        <RecordDetail icon={PercentIcon} label="TPI Score" value={record.tpi_score} showIfEmpty={true} />
        <RecordDetail icon={PercentIcon} label="Overall Score" value={record.overall_score} showIfEmpty={true} />
      </div>
      
      {/* Match Method Information Section */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-semibold">Match Method Information</h3>
        <RecordDetail icon={BlockIcon} label="Block Type" value={record.blockType} showIfEmpty={true} />
        <RecordDetail icon={MethodIcon} label="Match Method" value={record.matchMethod} showIfEmpty={true} />
        <RecordDetail icon={MethodIcon} label="Best Name Match Method" value={record.bestNameMatchMethod} showIfEmpty={true} />
        <RecordDetail icon={MethodIcon} label="Best Address Match Method" value={record.bestAddrMatchMethod} showIfEmpty={true} />
      </div>
      
      {/* Confidence Information Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Confidence Information</h3>
        <RecordDetail
          icon={ConfidenceIcon}
          label="Low Confidence"
          value={record.isLowConfidence !== undefined ? (record.isLowConfidence ? "Yes" : "No") : null}
          showIfEmpty={true}
        />
        <RecordDetail icon={ConfidenceIcon} label="LLM Confidence" value={record.llm_conf} showIfEmpty={true} />
        
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


export function CardReviewModal({ pair, isOpen, onClose, onResolve }: CardReviewModalProps) {
  if (!pair) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">Review Potential Duplicate</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Compare the two records below and decide on an action. Similarity Score: <span className="font-bold text-primary">{(pair.similarityScore * 100).toFixed(0)}%</span>
              </p>
            </DialogHeader>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <CustomerRecordCard record={pair.record1} title="Record 1" />
              <CustomerRecordCard record={pair.record2} title="Record 2" />
            </div>

            <Separator className="my-6" />

            <AiAnalysisDisplay 
              record1={pair.record1} 
              record2={pair.record2} 
              fuzzyScore={pair.similarityScore} 
            />

            <DialogFooter className="mt-8 gap-2 md:gap-0">
              <Button variant="outline" onClick={() => onResolve(pair.id, 'skipped')} className="w-full md:w-auto">
                <SkipForwardIcon className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button variant="destructive" onClick={() => onResolve(pair.id, 'not_duplicate')} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Not a Duplicate
                </Button>
                <Button onClick={() => onResolve(pair.id, 'merged')} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Duplicate
                </Button>
              </div>
            </DialogFooter>
          </div>
        </ScrollArea>
         {/* <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose> */}
      </DialogContent>
    </Dialog>
  );
}
