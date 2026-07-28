export default function ProfileStats({ postCount = 0, followersCount = 0, followingCount = 0 }) {
  return (
    <div className="flex items-center justify-center md:justify-start gap-8 text-sm">
      <div>
        <span className="font-bold text-white mr-1">{postCount}</span>
        <span className="text-gray-400">posts</span>
      </div>
      <div>
        <span className="font-bold text-white mr-1">{followersCount}</span>
        <span className="text-gray-400">followers</span>
      </div>
      <div>
        <span className="font-bold text-white mr-1">{followingCount}</span>
        <span className="text-gray-400">following</span>
      </div>
    </div>
  );
}
