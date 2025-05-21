import { Waves } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-primary-gradient shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 md:py-6">
        <div className="flex items-center space-x-3">
          <Waves className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            <span className="bg-gradient-to-b from-[#FA7225] to-[#C14DD4] text-transparent bg-clip-text">DataCleanse</span>
          </h1>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          Intelligent Customer Deduplication
        </p>
      </div>
    </header>
  );
}
