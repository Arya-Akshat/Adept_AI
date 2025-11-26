import { Lightbulb, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LearningObjectivesCardProps {
  objectives: string[];
}

export const LearningObjectivesCard = ({ objectives }: LearningObjectivesCardProps) => {
  return (
    <Card className="shadow-lg border-l-4 border-l-academic-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lightbulb className="h-5 w-5 text-academic-primary" />
          What You'll Learn
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-academic-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground leading-relaxed">{objective}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
