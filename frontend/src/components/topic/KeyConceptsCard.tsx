import { Tag } from "lucide-react";

interface KeyConceptsCardProps {
  concepts: string[];
}

function parseConcept(concept: string): { name: string; definition?: string } {
  const colonIdx = concept.indexOf(":");
  if (colonIdx > 0 && colonIdx < 60) {
    return {
      name: concept.slice(0, colonIdx).trim(),
      definition: concept.slice(colonIdx + 1).trim(),
    };
  }
  return { name: concept };
}

export const KeyConceptsCard = ({ concepts }: KeyConceptsCardProps) => {
  if (!concepts?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <Tag className="h-4 w-4" />
        </div>
        <h2 className="text-[16px] font-bold text-gray-900">Key Concepts</h2>
      </div>

      <div className="space-y-3">
        {concepts.map((concept, index) => {
          const { name, definition } = parseConcept(concept);
          return (
            <div
              key={index}
              className="group p-3 rounded-xl border border-gray-100 hover:border-orange-100 hover:bg-orange-50/10 transition-all shadow-sm"
            >
              <span className="text-[14px] font-bold text-gray-800 group-hover:text-orange-700 transition-colors">
                {name}
              </span>
              {definition && (
                <p className="mt-1 text-[12.5px] text-gray-500 leading-relaxed">
                  {definition}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
