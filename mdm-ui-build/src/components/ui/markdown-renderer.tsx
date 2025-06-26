"use client";

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'compact' | 'help';
}

export function MarkdownRenderer({ 
  content, 
  className, 
  variant = 'default' 
}: MarkdownRendererProps) {
  const renderMarkdown = useCallback((content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let blockquoteLines: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-muted-foreground">
                {formatInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeContent.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className="text-xs bg-muted p-4 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap mb-4 border border-border">
            <code>{codeContent.join('\n')}</code>
          </pre>
        );
        codeContent = [];
      }
    };

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        elements.push(
          <blockquote key={`quote-${elements.length}`} className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2">
            {blockquoteLines.map((line, idx) => (
              <p key={idx}>{formatInlineMarkdown(line)}</p>
            ))}
          </blockquote>
        );
        blockquoteLines = [];
      }
    };

    const formatInlineMarkdown = (text: string): React.ReactNode => {
      // Handle bold text
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Handle italic text
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Handle inline code
      text = text.replace(/`(.*?)`/g, '<code class="px-2 py-1 bg-muted text-muted-foreground rounded-md font-mono text-sm">$1</code>');
      
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          flushBlockquote();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Handle blockquotes
      if (line.startsWith('> ')) {
        flushList();
        blockquoteLines.push(line.slice(2));
        return;
      } else if (blockquoteLines.length > 0) {
        flushBlockquote();
      }

      // Handle headers
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2">
            {formatInlineMarkdown(line.slice(2))}
          </h1>
        );
        return;
      }
      
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className={cn(
            "font-semibold mt-6 mb-3 text-foreground",
            variant === 'compact' ? 'text-lg' : 'text-xl'
          )}>
            {formatInlineMarkdown(line.slice(3))}
          </h2>
        );
        return;
      }
      
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className={cn(
            "font-medium mt-4 mb-2 text-foreground",
            variant === 'compact' ? 'text-base' : 'text-lg'
          )}>
            {formatInlineMarkdown(line.slice(4))}
          </h3>
        );
        return;
      }

      // Handle lists
      if (line.startsWith('- ')) {
        listItems.push(line.slice(2));
        return;
      } else if (listItems.length > 0) {
        flushList();
      }

      // Handle horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        flushList();
        elements.push(
          <hr key={index} className="my-6 border-border" />
        );
        return;
      }

      // Handle tables (simple implementation)
      if (line.includes('|') && line.trim().length > 0) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          // Check if this is a header separator line
          if (cells.every(cell => cell.match(/^:?-+:?$/))) {
            return; // Skip separator lines
          }
          
          flushList();
          elements.push(
            <div key={index} className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-border">
                <tr>
                  {cells.map((cell, idx) => (
                    <td key={idx} className="border border-border p-2 text-muted-foreground">
                      {formatInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              </table>
            </div>
          );
          return;
        }
      }

      // Handle empty lines
      if (line.trim() === '') {
        flushList();
        elements.push(<div key={index} className="h-2" />);
        return;
      }

      // Handle regular paragraphs
      if (line.trim()) {
        flushList();
        elements.push(
          <p key={index} className={cn(
            "mb-4 text-muted-foreground leading-relaxed",
            variant === 'compact' && 'text-sm',
            variant === 'help' && 'text-base'
          )}>
            {formatInlineMarkdown(line)}
          </p>
        );
      }
    });

    // Flush any remaining content
    flushList();
    flushCodeBlock();
    flushBlockquote();

    return elements;
  }, [variant]);

  return (
    <div className={cn(
      'prose dark:prose-invert max-w-none',
      variant === 'compact' && 'prose-sm',
      variant === 'help' && 'prose-base',
      className
    )}>
      {renderMarkdown(content)}
    </div>
  );
}