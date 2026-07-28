export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={`animate-pulse bg-ig-surface/70 rounded-md ${className || ''}`}
      {...props}
    />
  );
}
