import { BookOpen, Sparkles } from "lucide-react";

interface DetailedExplanationCardProps {
  explanation: string;
}

// Minimal markdown-like formatter: handles **bold** and line breaks
function formatText(text: string): React.ReactNode[] {
  // Split by double newline for paragraphs
  return text.split(/\n\n+/).map((para, pIdx) => {
    // Handle **bold** inline
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>;
      }
      // Handle single newlines as line breaks
      return part.split("\n").map((line, li, arr) => (
        <span key={`${i}-${li}`}>
          {line}
          {li < arr.length - 1 && <br />}
        </span>
      ));
    });
    
    // First paragraph gets a special featured treatment
    if (pIdx === 0) {
      return (
        <div key={pIdx} className="relative bg-orange-50/40 dark:bg-orange-950/20 border-l-4 border-orange-500 rounded-r-xl px-5 py-4 mb-6 shadow-sm">
          <Sparkles className="absolute top-3 right-3 h-4 w-4 text-orange-400/70" />
          <p className="text-[15.5px] font-medium text-gray-800 leading-[1.75]">
            {formatted}
          </p>
        </div>
      );
    }

    return (
      <p key={pIdx} className="text-[15px] text-gray-700 leading-[1.8] mb-4 last:mb-0">
        {formatted}
      </p>
    );
  });
}

export const DetailedExplanationCard = ({ explanation }: DetailedExplanationCardProps) => {
  if (!explanation) return null;
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <BookOpen className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Detailed Explanation</h2>
      </div>
      
      <div className="prose max-w-none">
        {formatText(explanation)}
      </div>
    </div>
  );
};
