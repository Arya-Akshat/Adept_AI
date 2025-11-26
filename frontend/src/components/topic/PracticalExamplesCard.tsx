import { Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PracticalExamplesCardProps {
  examples: string[];
}

export const PracticalExamplesCard = ({ examples }: PracticalExamplesCardProps) => {
  return (
    <Card className="shadow-lg border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Code className="h-5 w-5 text-primary" />
          Practical Examples
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {examples.map((example, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-muted/50 border border-border"
          >
            <p className="text-foreground leading-relaxed">{example}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
