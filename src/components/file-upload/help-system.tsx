"use client";

import { useState, useCallback, useEffect } from 'react';
import { HelpCircle, BookOpen, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const HELP_GUIDE_CONTENT = `# Master Data Cleansing Help Guide

This guide explains how to use the Master Data Cleansing tool to find and manage duplicate records in your data.

## What This Tool Does

The Master Data Cleansing tool helps you find duplicate company or customer records in your Excel or CSV files. Think of it like a smart spell-checker, but for duplicate entries instead of misspelled words.

## Blocking Strategies Explained

When working with large files, searching for duplicates can be time-consuming. "Blocking strategies" help speed things up by focusing your search. Think of these like different ways to sort a deck of cards before looking for matches.

### Available Strategies

#### 1. Prefix Blocking
- **What it does:** Groups records that start with the same first few letters in their name and city
- **When to use:** Always a good starting point - very fast with good results
- **Example:** "Acme Corporation" in "New York" and "ACME Corp" in "New York" would be grouped together

#### 2. Metaphone Blocking
- **What it does:** Groups records that sound similar when pronounced
- **When to use:** Good for company names that might be spelled differently but sound the same
- **Example:** "Acme" and "Akme" would be grouped together because they sound alike

#### 3. Soundex Blocking
- **What it does:** Another way to group records that sound similar (slightly different than Metaphone)
- **When to use:** Use alongside Metaphone for better coverage
- **Example:** "Smith" and "Smyth" would be grouped together

#### 4. N-gram Blocking
- **What it does:** Groups records that share parts of words
- **When to use:** Good for catching misspellings or slight variations in names
- **Example:** "Johnson" and "Johnsen" would be grouped together

#### 5. AI Scoring
- **What it does:** Uses artificial intelligence to better determine if records are truly duplicates
- **When to use:** For final verification when you need high accuracy
- **Note:** Significantly slows down processing

## Recommended Settings for Different Situations

### Quick Check of Small Files (Under 1,000 Records)
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Medium-Sized Files (1,000-10,000 Records)
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Large Files (10,000-100,000 Records)
- ✅ Prefix Blocking
- ❌ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Very Large Files (Over 100,000 Records)
- ✅ Prefix Blocking only
- ❌ All other options

### When Accuracy is Critical
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ✅ Soundex Blocking
- ✅ N-gram Blocking
- ✅ AI Scoring
- **Note:** This will be much slower but will find more potential duplicates

## Similarity Thresholds

The similarity threshold controls how similar records need to be to count as potential duplicates:

- **Name Threshold (default 70%):** How similar the names need to be
- **Overall Threshold (default 70%):** How similar the records are overall

### Adjusting Thresholds

- **Lower thresholds (60-70%):** Find more potential duplicates, but may include false matches
- **Medium thresholds (70-80%):** Balanced approach (recommended)
- **Higher thresholds (80-90%):** Only find very obvious duplicates

## Troubleshooting

### Common Issues

1. **No duplicates found**
   - Try lowering the similarity thresholds
   - Try different blocking strategies
   - Check your column mapping to make sure the right fields are being compared

2. **Too many false matches**
   - Increase the similarity thresholds
   - Make sure your column mapping is correct

3. **Processing is very slow**
   - Reduce the number of blocking strategies
   - Turn off N-gram Blocking and AI Scoring
   - Use only Prefix Blocking for very large files

4. **System seems frozen**
   - Large files with multiple blocking strategies can take a long time
   - Start with just Prefix Blocking and add others if needed

## Quick Tips

- Always map the "customer_name" field to the column containing company or customer names
- Start with Prefix Blocking only to get quick initial results
- Add more blocking strategies one at a time if you need more thorough results
- The threshold settings of 70% for both name and overall similarity work well for most cases
- Save AI Scoring for final verification of important data only

## Need More Help?

Contact your system administrator or the help desk for assistance.`;

const TOUR_STEPS = [
  {
    id: 'blocking-section',
    title: 'Blocking Strategy Configuration',
    content: 'This section controls how the system searches for duplicates. Blocking strategies help speed up processing by grouping similar records together before detailed comparison.',
    position: 'bottom'
  },
  {
    id: 'prefix-strategy',
    title: 'Prefix Blocking',
    content: 'The most efficient strategy - groups records that start with the same letters. Always recommended as a starting point.',
    position: 'right'
  },
  {
    id: 'metaphone-strategy',
    title: 'Metaphone Blocking',
    content: 'Groups records that sound similar when pronounced. Good for catching spelling variations of company names.',
    position: 'right'
  },
  {
    id: 'soundex-strategy',
    title: 'Soundex Blocking',
    content: 'Another phonetic matching algorithm. Use alongside Metaphone for better coverage of sound-alike names.',
    position: 'right'
  },
  {
    id: 'ngram-strategy',
    title: 'N-Gram Blocking',
    content: 'Matches text patterns by breaking names into character sequences. More thorough but significantly slower.',
    position: 'right'
  },
  {
    id: 'ai-strategy',
    title: 'AI Scoring',
    content: 'Uses artificial intelligence for the most accurate duplicate detection. Warning: This dramatically increases processing time.',
    position: 'right'
  },
  {
    id: 'thresholds-section',
    title: 'Similarity Thresholds',
    content: 'These sliders control how similar records need to be to count as potential duplicates. Lower values find more matches but may include false positives.',
    position: 'top'
  },
  {
    id: 'column-mapping',
    title: 'Column Mapping Section',
    content: 'This is where you tell the system which columns in your Excel file contain which type of data. This step is crucial for accurate duplicate detection.',
    position: 'top'
  },
  {
    id: 'customer_name-mapping',
    title: 'Customer Name Mapping (Required)',
    content: 'You MUST map this field to the column containing company or customer names. The system cannot automatically detect which column contains the actual customer names - you need to manually select the correct one.',
    position: 'right'
  },
  {
    id: 'address-mapping',
    title: 'Address Mapping (Optional)',
    content: 'Map this to your address column if available. Address information helps improve duplicate detection accuracy.',
    position: 'right'
  },
  {
    id: 'city-mapping',
    title: 'City Mapping (Optional)',
    content: 'City information is used for blocking and provides additional context for duplicate detection.',
    position: 'right'
  },
  {
    id: 'country-mapping',
    title: 'Country Mapping (Optional)',
    content: 'Country information helps provide geographic context and can improve matching accuracy.',
    position: 'right'
  },
  {
    id: 'tpi-mapping',
    title: 'Unique ID/TPI Mapping (Optional)',
    content: 'If your data has unique identifiers, map them here. This helps track records through the deduplication process.',
    position: 'right'
  }
];

interface HelpSystemProps {
  className?: string;
}

export function HelpSystem({ className = '' }: HelpSystemProps) {
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const [showReferenceGuide, setShowReferenceGuide] = useState(false);
  const [showInteractiveTour, setShowInteractiveTour] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tourHighlightedElement, setTourHighlightedElement] = useState<string | null>(null);
  const [tourCardPosition, setTourCardPosition] = useState('bottom-4');

  const startInteractiveTour = useCallback(() => {
    setShowHelpOptions(false);
    setShowInteractiveTour(true);
    setCurrentTourStep(0);
    setTourHighlightedElement(TOUR_STEPS[0].id);
    setTourCardPosition('bottom-4');
  }, []);

  const nextTourStep = useCallback(() => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      const nextStep = currentTourStep + 1;
      setCurrentTourStep(nextStep);
      setTourHighlightedElement(TOUR_STEPS[nextStep].id);
      setTourCardPosition('bottom-4');
    } else {
      setShowInteractiveTour(false);
      setTourHighlightedElement(null);
      setCurrentTourStep(0);
    }
  }, [currentTourStep]);

  const previousTourStep = useCallback(() => {
    if (currentTourStep > 0) {
      const prevStep = currentTourStep - 1;
      setCurrentTourStep(prevStep);
      setTourHighlightedElement(TOUR_STEPS[prevStep].id);
      setTourCardPosition('bottom-4');
    }
  }, [currentTourStep]);

  const closeTour = useCallback(() => {
    setShowInteractiveTour(false);
    setTourHighlightedElement(null);
    setCurrentTourStep(0);
  }, []);

  const openReferenceGuide = useCallback(() => {
    setShowHelpOptions(false);
    setShowReferenceGuide(true);
  }, []);

  const closeReferenceGuide = useCallback(() => {
    setShowReferenceGuide(false);
  }, []);

  const renderMarkdown = useCallback((content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-8 mb-4 text-foreground">{line.slice(2)}</h1>;
        }
        
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 mb-1 text-muted-foreground">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-4 mb-1 text-muted-foreground list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index} className="mb-2 text-muted-foreground">
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
              )}
            </p>
          );
        }
        
        if (line.trim()) {
          return <p key={index} className="mb-2 text-muted-foreground">{line}</p>;
        }
        
        return <div key={index} className="mb-2"></div>;
      });
  }, []);

  const getTourCardPosition = useCallback(() => {
    if (!showInteractiveTour || !tourHighlightedElement) {
      return 'bottom-4';
    }

    const element = document.getElementById(tourHighlightedElement);
    if (!element) {
      return 'bottom-4';
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const cardHeight = 200;
    const margin = 20;

    if (rect.bottom > viewportHeight / 2 && (viewportHeight - rect.bottom) < (cardHeight + margin)) {
      return 'top-4';
    }

    return 'bottom-4';
  }, [showInteractiveTour, tourHighlightedElement]);

  useEffect(() => {
    if (showInteractiveTour && tourHighlightedElement) {
      const element = document.getElementById(tourHighlightedElement);
      if (element) {
        element.style.position = 'relative';
        element.style.zIndex = '51';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
        element.style.borderRadius = '8px';
        element.style.transition = 'all 0.3s ease';
        
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        
        setTimeout(() => {
          window.scrollBy({ top: -100, behavior: 'smooth' });
        }, 300);
        
        return () => {
          element.style.position = '';
          element.style.zIndex = '';
          element.style.boxShadow = '';
          element.style.borderRadius = '';
          element.style.transition = '';
        };
      }
    }
  }, [showInteractiveTour, tourHighlightedElement]);

  useEffect(() => {
    if (showInteractiveTour) {
      const timer = setTimeout(() => {
        setTourCardPosition(getTourCardPosition());
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showInteractiveTour, tourHighlightedElement, getTourCardPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHelpOptions) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowHelpOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelpOptions]);

  return (
    <>
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelpOptions(!showHelpOptions)}
            className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Need Help?
          </Button>
          
          {showHelpOptions && (
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-2 z-50 min-w-[200px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={startInteractiveTour}
                className="w-full justify-start text-left hover:bg-primary/10"
              >
                <Play className="w-4 h-4 mr-2 text-primary" />
                Interactive Tour
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openReferenceGuide}
                className="w-full justify-start text-left hover:bg-primary/10"
              >
                <BookOpen className="w-4 h-4 mr-2 text-primary" />
                Reference Guide
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Tour Overlay */}
      {showInteractiveTour && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className={`fixed ${tourCardPosition} left-1/2 transform -translate-x-1/2 z-52 max-w-md w-full mx-4`}>
            <Card className="shadow-2xl border-primary/20 bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Step {currentTourStep + 1} of {TOUR_STEPS.length}
                    </Badge>
                    <h3 className="font-semibold text-foreground">{TOUR_STEPS[currentTourStep].title}</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeTour}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground mb-4">{TOUR_STEPS[currentTourStep].content}</p>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousTourStep}
                    disabled={currentTourStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex space-x-1">
                    {TOUR_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentTourStep ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={nextTourStep}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {currentTourStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                    {currentTourStep !== TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Reference Guide Side Panel */}
      {showReferenceGuide && (
        <div className="fixed inset-0 z-50 flex">
          <div className="ml-auto w-1/2 min-w-[500px] max-w-[800px] bg-background shadow-2xl overflow-hidden flex flex-col border-l border-border">
            <div className="bg-primary/5 border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Master Data Cleansing Help Guide</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={closeReferenceGuide}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderMarkdown(HELP_GUIDE_CONTENT)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}