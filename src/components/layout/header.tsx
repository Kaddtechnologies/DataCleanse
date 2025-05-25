import { Waves } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-primary-gradient shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 md:py-6">
        <div className="flex items-center space-x-3">
          <Waves className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-2xl font-bold title-gradient">DataCleanse</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Intelligent Customer Deduplication
        </p>
      </div>
    </header>
  );
}
