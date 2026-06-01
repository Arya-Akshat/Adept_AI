import { Youtube, Play } from "lucide-react";

interface VideoCardProps {
  video: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    duration: string;
    viewCount: string;
  };
}

const VideoCard = ({ video }: VideoCardProps) => (
  <a
    href={`https://youtube.com/watch?v=${video.videoId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-col w-[260px] sm:w-[280px] shrink-0 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-300"
  >
    <div className="relative aspect-video overflow-hidden bg-gray-100">
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* Youtube colored Play Overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
          <Play className="h-5 w-5 fill-white ml-0.5" />
        </div>
      </div>
      {/* Duration Badge */}
      <div className="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
        {video.duration}
      </div>
    </div>
    
    <div className="p-3.5 flex-1 flex flex-col justify-between">
      <div>
        <h4 className="font-bold text-[13px] leading-snug line-clamp-2 text-gray-800 group-hover:text-red-600 transition-colors mb-1.5">
          {video.title}
        </h4>
        <p className="text-[11px] font-semibold text-gray-500">{video.channelName}</p>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
        <span>Curated video</span>
        {video.viewCount && (
          <span className="bg-gray-50 px-1.5 py-0.5 rounded">
            {video.viewCount.toLowerCase().includes("views") ? video.viewCount : `${video.viewCount} views`}
          </span>
        )}
      </div>
    </div>
  </a>
);

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
  if (!videos?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#FF0000]">
          <Youtube className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-[16px] font-bold text-gray-900">Recommended Resources</h2>
      </div>

      <div
        className="flex gap-5 overflow-x-auto pb-4 pt-1 px-1 -mx-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#f3f4f6 transparent" }}
      >
        {videos.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>
    </div>
  );
};
