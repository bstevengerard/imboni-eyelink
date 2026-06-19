import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatBubbleProps = {
  isMe: boolean;
  text: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  delivered?: boolean;
  seen?: boolean;
  primaryColor?: 'primary' | 'accent';
};

export function ChatBubble({ isMe, text, time, status, delivered, seen, primaryColor = 'primary' }: ChatBubbleProps) {
  const renderTicks = () => {
    if (seen) {
      return <CheckCheck className="h-3 w-3 text-primary" />;
    }
    if (delivered) {
      return <CheckCheck className="h-3 w-3 text-muted-foreground/70" />;
    }
    return <Check className="h-3 w-3 text-muted-foreground/70" />;
  };

  const bgClass = primaryColor === 'accent' ? 'bg-accent' : 'bg-primary';
  const textClass = primaryColor === 'accent' ? 'text-accent-foreground' : 'text-primary-foreground';

  return (
    <div className={cn("flex mb-1", isMe ? "justify-end" : "justify-start")}>
      <div className="max-w-[70%] group">
        <div
          className={cn(
            "px-3 py-2 rounded-lg",
            isMe 
              ? `${bgClass} ${textClass} rounded-tr-none` 
              : "bg-card text-foreground rounded-tl-none"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{text}</p>
          <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "")}>
            <span
              className={cn(
                "text-[10px]",
                isMe ? `${textClass}/70` : "text-muted-foreground/70"
              )}
            >
              {time}
            </span>
            {isMe && renderTicks()}
          </div>
        </div>
      </div>
    </div>
  );
}