import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DetailedExplanationCardProps {
  explanation: string;
}

export const DetailedExplanationCard = ({ explanation }: DetailedExplanationCardProps) => {
  const paragraphs = explanation.split('\n\n');

  return (
    <Card className="shadow-lg border-l-4 border-l-academic-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookOpen className="h-5 w-5 text-academic-secondary" />
          Detailed Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};
