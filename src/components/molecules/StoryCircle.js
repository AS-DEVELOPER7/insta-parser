import Avatar from '@/components/atoms/Avatar';

export default function StoryCircle({ story, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[68px] group"
    >
      <div className="transition-transform group-hover:scale-105">
        <Avatar src={story.media_url} size="lg" hasStory={true} />
      </div>
      <span className="text-xs text-gray-300 truncate max-w-[64px]">
        {new Date(story.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    </button>
  );
}
