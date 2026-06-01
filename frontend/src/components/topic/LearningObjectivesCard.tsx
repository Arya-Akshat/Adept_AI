import { useState } from "react";
import { Target, CheckCircle2 } from "lucide-react";

interface LearningObjectivesCardProps {
  objectives: string[];
}

export const LearningObjectivesCard = ({ objectives }: LearningObjectivesCardProps) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  if (!objectives?.length) return null;

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = objectives.length;
  const percentage = (completedCount / totalCount) * 100;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Target className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-[16px] font-bold text-gray-900">Learning Objectives</h2>
        </div>
        <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
          {completedCount}/{totalCount} Done
        </span>
      </div>

      {/* Checklist progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1 mb-5 overflow-hidden">
        <div 
          className="bg-orange-500 h-1 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>

      <ul className="space-y-3">
        {objectives.map((objective, index) => {
          const isChecked = !!checkedItems[index];
          return (
            <li 
              key={index} 
              onClick={() => toggleCheck(index)}
              className={`flex items-start gap-3 p-2.5 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-all ${
                isChecked ? "bg-gray-50/30" : ""
              }`}
            >
              <button 
                type="button" 
                className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
                  isChecked 
                    ? "border-orange-500 bg-orange-500 text-white shadow-sm" 
                    : "border-gray-200 hover:border-gray-400 bg-white"
                }`}
              >
                {isChecked && <CheckCircle2 className="h-3.5 w-3.5 fill-white stroke-orange-500" />}
              </button>
              <span 
                className={`text-[13.5px] leading-relaxed transition-all duration-200 ${
                  isChecked ? "text-gray-400 line-through" : "text-gray-700"
                }`}
              >
                {objective}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
