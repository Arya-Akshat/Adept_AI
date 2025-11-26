import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface TopicHeaderProps {
  topic: {
    title: string;
  };
  unitIndex: number;
  onBack: () => void;
}

export const TopicHeader = ({ topic, unitIndex, onBack }: TopicHeaderProps) => {
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roadmap
      </Button>

      <div className="space-y-3">
        <Badge className="bg-gradient-to-r from-academic-primary to-academic-secondary text-white">
          Unit {unitIndex + 1}
        </Badge>
        
        <h1 className="text-3xl font-bold text-foreground">
          {topic.title}
        </h1>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/roadmap">Roadmap</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Unit {unitIndex + 1}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{topic.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};
