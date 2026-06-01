import { Terminal, Lightbulb } from "lucide-react";

interface PracticalExamplesCardProps {
  examples: string[];
}

function looksLikeCode(s: string): boolean {
  return (
    s.includes("```") ||
    /^\s*(import |export |def |function |class |const |let |var |#include|<[a-z])/m.test(s)
  );
}

function renderExample(example: string, index: number) {
  const isCode = looksLikeCode(example);

  if (isCode) {
    const cleaned = example.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
    return (
      <div key={index} className="rounded-2xl overflow-hidden border border-gray-800 shadow-lg">
        {/* Terminal Header */}
        <div className="flex items-center justify-between bg-[#18181b] px-4 py-2.5 border-b border-zinc-800">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 font-semibold tracking-wider">CODE PREVIEW</span>
        </div>
        {/* Preformatted Code block */}
        <pre
          className="bg-[#09090b] text-[#f4f4f5] text-[13px] font-mono leading-[1.7] px-5 py-4 overflow-x-auto"
          style={{ tabSize: 2 }}
        >
          <code>{cleaned}</code>
        </pre>
      </div>
    );
  }

  return (
    <div key={index} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-all">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Example {index + 1}</span>
        <p className="mt-1 text-[14px] text-gray-700 leading-relaxed font-medium">{example}</p>
      </div>
    </div>
  );
}

export const PracticalExamplesCard = ({ examples }: PracticalExamplesCardProps) => {
  if (!examples?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <Terminal className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Practical Applications</h2>
      </div>

      <div className="space-y-5">
        {examples.map((example, i) => renderExample(example, i))}
      </div>
    </div>
  );
};
