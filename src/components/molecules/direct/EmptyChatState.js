import { MessageCircle } from 'lucide-react';

export default function EmptyChatState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <MessageCircle size={48} className="text-gray-600 mb-4" />
      <h3 className="text-lg font-bold text-white mb-1">Your Messages</h3>
      <p className="text-xs text-gray-400 max-w-xs">
        Select a conversation thread from the left menu to view your historical chat log.
      </p>
    </div>
  );
}
