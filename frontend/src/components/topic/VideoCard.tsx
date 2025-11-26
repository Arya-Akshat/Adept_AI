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

export const VideoCard = ({ video }: VideoCardProps) => {
  const handleClick = () => {
    window.open(`https://youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  return (
    <div
      className="group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105 bg-white shadow-sm hover:shadow-md"
      onClick={handleClick}
    >
      <div className="relative aspect-video">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {video.duration}
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-2 mb-1 text-foreground">
          {video.title}
        </h4>
        <p className="text-xs text-muted-foreground">{video.channelName}</p>
        <p className="text-xs text-muted-foreground">{video.viewCount} views</p>
      </div>
    </div>
  );
};
