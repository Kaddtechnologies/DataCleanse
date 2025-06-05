"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
  id?: string;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false, 
  variant = 'default',
  className = '',
  id
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (variant === 'compact') {
    return (
      <div className={`border border-border rounded-lg ${className}`} id={id}>
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 h-auto text-left hover:bg-muted/50 rounded-t-lg"
        >
          <h3 className="text-lg font-semibold">{title}</h3>
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        {isOpen && (
          <div className="p-4 border-t border-border">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`shadow-sm ${className}`} id={id}>
      <CardHeader className="pb-3">
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-0 h-auto text-left"
        >
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}