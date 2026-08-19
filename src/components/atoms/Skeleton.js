export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-[#181818] rounded-md ${className || ''}`}
      {...props}
    />
  );
}
