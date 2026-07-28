export default function ChatHeader({ participantName }) {
  return (
    <div className="p-4 border-b border-ig-border flex items-center gap-3 bg-black">
      <div className="w-9 h-9 rounded-full bg-ig-surface border border-ig-border flex items-center justify-center text-ig-primary font-bold text-sm uppercase">
        {participantName.charAt(0)}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-white">{participantName}</h3>
        <span className="text-xs text-gray-400">Instagram Archive Direct</span>
      </div>
    </div>
  );
}
