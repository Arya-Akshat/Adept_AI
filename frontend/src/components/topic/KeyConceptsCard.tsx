import { Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyConceptsCardProps {
  concepts: string[];
}

export const KeyConceptsCard = ({ concepts }: KeyConceptsCardProps) => {
  return (
    <Card className="shadow-lg border-l-4 border-l-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Key className="h-5 w-5 text-accent" />
          Key Concepts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {concepts.map((concept, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-academic-primary/10 to-academic-secondary/10 hover:from-academic-primary/20 hover:to-academic-secondary/20 border border-academic-primary/20"
            >
              {concept}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
