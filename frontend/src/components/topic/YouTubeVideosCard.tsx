import { Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VideoCard } from "./VideoCard";

interface YouTubeVideosCardProps {
  videos: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    duration: string;
    viewCount: string;
  }[];
}

export const YouTubeVideosCard = ({ videos }: YouTubeVideosCardProps) => {
  return (
    <Card className="shadow-lg bg-gray-50 lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Youtube className="h-5 w-5 text-[#FF0000]" />
          Recommended Videos
        </CardTitle>
        <CardDescription>
          Learn more from these curated tutorials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {videos.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </CardContent>
    </Card>
  );
};
