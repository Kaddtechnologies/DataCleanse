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

const RecordDetail = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-start space-x-2 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <span className="font-medium text-muted-foreground">{label}: </span>
        <span>{value}</span>
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
      <RecordDetail icon={User} label="Name" value={record.name} />
      <RecordDetail icon={Mail} label="Email" value={record.email} />
      <RecordDetail icon={Phone} label="Phone" value={record.phone} />
      <RecordDetail icon={MapPin} label="Address" value={record.address} />
      {Object.entries(record)
        .filter(([key]) => !['id', 'name', 'email', 'phone', 'address'].includes(key))
        .map(([key, value]) => (
          <RecordDetail key={key} icon={InfoIcon} label={key.charAt(0).toUpperCase() + key.slice(1)} value={String(value)} />
        ))}
    </CardContent>
  </Card>
);

// Placeholder for a generic info icon if needed
const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
         <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
