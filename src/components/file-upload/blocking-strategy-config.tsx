"use client";

import { useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CollapsibleSection } from './collapsible-section';

export interface BlockingStrategyConfig {
  usePrefix: boolean;
  useMetaphone: boolean;
  useSoundex: boolean;
  useNgram: boolean;
  useAi: boolean;
  nameThreshold: number;
  overallThreshold: number;
}

interface BlockingStrategyConfigProps {
  config: BlockingStrategyConfig;
  onConfigChange: (config: BlockingStrategyConfig) => void;
  rowCount: number | null;
  calculateEstimatedTime: () => { minutes: number; seconds: number; totalTimeSeconds: number } | null;
}

const BLOCKING_STRATEGIES = [
  {
    id: 'use_prefix',
    name: 'Prefix Blocking',
    description: 'Groups records with the same beginning characters of names'
  },
  {
    id: 'use_metaphone',
    name: 'Metaphone',
    description: 'Uses phonetic algorithm to match names that sound similar but spelled differently'
  },
  {
    id: 'use_soundex',
    name: 'Soundex',
    description: 'Groups names with similar pronunciation regardless of spelling variations'
  },
  {
    id: 'use_ngram',
    name: 'N-Gram',
    description: 'Matches text patterns by breaking names into character sequences'
  }
];

export function BlockingStrategyConfig({ 
  config, 
  onConfigChange, 
  rowCount, 
  calculateEstimatedTime 
}: BlockingStrategyConfigProps) {
  const updateConfig = useCallback((updates: Partial<BlockingStrategyConfig>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  return (
    <CollapsibleSection 
      title="Blocking Strategy Configuration" 
      variant="compact"
      id="blocking-section"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {BLOCKING_STRATEGIES.map((strategy) => (
            <div key={strategy.id} className="flex items-center space-x-2" id={`${strategy.id.replace('use_', '')}-strategy`}>
              <Checkbox
                id={`strategy-${strategy.id}`}
                checked={
                  strategy.id === 'use_prefix' ? config.usePrefix :
                  strategy.id === 'use_metaphone' ? config.useMetaphone :
                  strategy.id === 'use_soundex' ? config.useSoundex :
                  strategy.id === 'use_ngram' ? config.useNgram : false
                }
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  if (strategy.id === 'use_prefix') updateConfig({ usePrefix: !!checked });
                  else if (strategy.id === 'use_metaphone') updateConfig({ useMetaphone: !!checked });
                  else if (strategy.id === 'use_soundex') updateConfig({ useSoundex: !!checked });
                  else if (strategy.id === 'use_ngram') updateConfig({ useNgram: !!checked });
                }}
              />
              <label
                htmlFor={`strategy-${strategy.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {strategy.name}
              </label>
            </div>
          ))}
          
          <div className="flex items-center space-x-2" id="ai-strategy">
            <Checkbox
              id="use-ai"
              checked={config.useAi}
              onCheckedChange={(checked: boolean | "indeterminate") => updateConfig({ useAi: !!checked })}
            />
            <label
              htmlFor="use-ai"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Clean with AI
            </label>
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <h4 className="text-sm font-medium mb-2">Selected Strategies:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {BLOCKING_STRATEGIES.map(strategy => {
              const isSelected =
                strategy.id === 'use_prefix' ? config.usePrefix :
                strategy.id === 'use_metaphone' ? config.useMetaphone :
                strategy.id === 'use_soundex' ? config.useSoundex :
                strategy.id === 'use_ngram' ? config.useNgram : false;
              
              return isSelected ? (
                <li key={strategy.id} className="text-sm">
                  <span className="font-medium">{strategy.name}:</span> {strategy.description}
                </li>
              ) : null;
            })}
            {config.useAi && (
              <li className="text-sm">
                <span className="font-medium">Clean with AI:</span> Uses AI to analyze and determine duplicate confidence
              </li>
            )}
          </ul>
          
          {rowCount && (
            <div className="mt-4 border-t border-border pt-3">
              <h4 className="text-sm font-medium mb-2">Estimated Processing Time:</h4>
              <div className="flex items-center">
                <div className="text-sm">
                  {(() => {
                    const estimate = calculateEstimatedTime();
                    if (!estimate) return "Calculating...";
                    
                    return (
                      <span className="font-medium">
                        ~{estimate.minutes > 0 ? `${estimate.minutes} minute${estimate.minutes !== 1 ? 's' : ''}` : ''}
                        {estimate.seconds > 0 ? `${estimate.minutes > 0 ? ' ' : ''}${estimate.seconds} second${estimate.seconds !== 1 ? 's' : ''}` : ''}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              {config.useAi && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md">
                  <strong>Note:</strong> AI processing significantly increases processing time. For faster results,
                  consider using non-AI strategies and using the review card's AI recommendation feature for
                  individual rows when needed.
                </div>
              )}
              
              {config.useNgram && !config.useAi && (
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-md">
                  <strong>Note:</strong> N-Gram processing is more thorough but takes longer than other non-AI methods.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-4" id="thresholds-section">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="name-threshold">Name Matching Threshold: {config.nameThreshold}%</Label>
            </div>
            <Slider
              id="name-threshold"
              min={0}
              max={100}
              step={1}
              value={[config.nameThreshold]}
              onValueChange={(value: number[]) => updateConfig({ nameThreshold: value[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More Inclusive</span>
              <span>More Precise</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="overall-threshold">Overall Matching Threshold: {config.overallThreshold}%</Label>
            </div>
            <Slider
              id="overall-threshold"
              min={0}
              max={100}
              step={1}
              value={[config.overallThreshold]}
              onValueChange={(value: number[]) => updateConfig({ overallThreshold: value[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More Inclusive</span>
              <span>More Precise</span>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}