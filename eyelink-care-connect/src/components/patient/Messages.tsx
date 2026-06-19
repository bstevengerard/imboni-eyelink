import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Check, MessageSquare, Paperclip, Search, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

type ConversationRow = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  last_message: string | null;
  last_at: string | null;
  unread_count?: number;
};

type MessageRow = {
  id: string;
  sender_id: string;
  text: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
  delivered?: boolean;
  seen?: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  if (msgDate.getTime() === today.getTime()) return 'Today';
  
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function PatientMessages() {
  const { user } = useAuth();
  const {
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessagesSeen,
    onMessageReceived,
    onMessageSeenUpdate,
    emitTypingStart,
    emitTypingStop,
    onTypingStart,
    onTypingStop,
    onPresenceUpdate,
  } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const selectedConversation = useMemo(
    () => (selectedConversationId ? conversations.find((c) => c.id === selectedConversationId) ?? null : null),
    [conversations, selectedConversationId]
  );

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = q
      ? conversations.filter((c) => {
          return (
            (c.doctor_name ?? '').toLowerCase().includes(q) ||
            (c.specialty ?? '').toLowerCase().includes(q) ||
            (c.last_message ?? '').toLowerCase().includes(q)
          );
        })
      : conversations;

    return [...rows].sort((a, b) => {
      const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
      if (unreadDiff) return unreadDiff;
      return Number(new Date(b.last_at || 0)) - Number(new Date(a.last_at || 0));
    });
  }, [conversations, searchQuery]);

  // Conversations
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<ConversationRow[]>('/api/patient/messages/conversations');
        if (cancelled) return;
        setConversations(res.success && Array.isArray(res.data) ? (res.data as any) : []);
      } catch {
        if (!cancelled) setConversations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Socket typing indicators
  useEffect(() => {
    if (!selectedConversationId) return;
    
    const cleanup = onTypingStart?.((data) => {
      if (String(data?.conversationId) === String(selectedConversationId)) {
        setIsTyping(true);
      }
    });
    
    const cleanup2 = onTypingStop?.((data) => {
      if (String(data?.conversationId) === String(selectedConversationId)) {
        setIsTyping(false);
      }
    });
    
    return () => {
      cleanup?.();
      cleanup2?.();
    };
  }, [onTypingStart, onTypingStop, selectedConversationId]);

// Presence updates for the other user (doctor)
   useEffect(() => {
     if (!selectedConversation?.doctor_id) return;
     
     const cleanup = onPresenceUpdate?.((data) => {
       if (String(data?.userId) === String(selectedConversation.doctor_id)) {
         setOtherUserOnline(data.online);
       }
     });
     
     return () => cleanup?.();
   }, [onPresenceUpdate, selectedConversation?.doctor_id]);

   // Mark messages as seen when viewing conversation
   useEffect(() => {
     if (!selectedConversationId) return;
     markMessagesSeen(selectedConversationId);
     setConversations((prev) =>
       prev.map((c) =>
         c.id === selectedConversationId ? { ...c, unread_count: 0 } : c
       )
     );
   }, [selectedConversationId, markMessagesSeen]);

   // Handle seen updates from socket
   useEffect(() => {
     return onMessageSeenUpdate?.((data) => {
       setMessages((prev) =>
         prev.map((m) =>
           m.id === data.messageId ? { ...m, seen: true, delivered: true } : m
         )
       );
     });
   }, [onMessageSeenUpdate]);

// Messages
   useEffect(() => {
     let cancelled = false;

     (async () => {
       if (!selectedConversationId) {
         setMessages([]);
         return;
       }

       try {
         const res = await api.get<any[]>(`/api/patient/messages/conversations/${selectedConversationId}/messages`);
         if (cancelled) return;

         if (res.success && Array.isArray(res.data)) {
           setMessages(
             res.data.map((m: any) => ({
               id: String(m.id ?? m._id),
               sender_id: String(m.sender_id ?? m.senderId ?? ''),
               text: m.text ?? '',
               createdAt: m.created_at
                 ? new Date(m.created_at).toISOString()
                 : m.createdAt
                   ? new Date(m.createdAt).toISOString()
                   : new Date().toISOString(),
               status: m.seen ? 'read' : m.delivered ? 'delivered' : 'sent',
               delivered: m.delivered,
               seen: m.seen,
             }))
           );
         } else {
           setMessages([]);
         }
       } catch {
         if (!cancelled) setMessages([]);
       }
     })();

     return () => {
       cancelled = true;
     };
   }, [selectedConversationId]);

  // Auto-scroll to bottom
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check initial online status when conversation is selected
  useEffect(() => {
    if (selectedConversation?.doctor_id) {
      api.get(`/api/presence/${selectedConversation.doctor_id}`)
        .then((res) => {
          if (res.success && res.online !== undefined) {
            setOtherUserOnline(res.online);
          }
        })
        .catch(() => {});
    }
  }, [selectedConversation?.doctor_id]);

// Socket listener
useEffect(() => {
    return onMessageReceived?.((payload: any) => {
      const conversationId = String(payload?.conversationId ?? '');
      if (!conversationId) return;

      const msgId = String(payload?.id ?? '');
      if (!msgId) return;

      const msgText = payload?.content ?? payload?.text ?? '';
      const senderId = String(payload?.senderId ?? payload?.sender_id ?? '');
      const createdAt = payload?.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString();
      const isFromMe = user?.id ? senderId === String(user.id) : false;

      setConversations((prev) =>
        [...prev
          .map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  last_message: msgText || c.last_message,
                  last_at: createdAt,
                  unread_count: conversationId === selectedConversationId || isFromMe ? 0 : (c.unread_count || 0) + 1,
                }
              : c,
          ),
        ].sort((a, b) => {
          const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
          if (unreadDiff) return unreadDiff;
          return Number(new Date(b.last_at || 0)) - Number(new Date(a.last_at || 0));
        })
      );

      const currentId = selectedConversationId;
      if (!currentId) return;
      if (conversationId !== currentId) return;

      setMessages((prev) => {
        const existsById = prev.some((m) => m.id === msgId);
        if (existsById) return prev;
        
        const optimisticIndex = prev.findIndex((m) => m.id.startsWith('tmp-') && m.text === msgText);
        if (optimisticIndex >= 0) {
          const updated = [...prev];
          updated[optimisticIndex] = {
            id: msgId,
            sender_id: senderId,
            text: msgText,
            createdAt,
            status: payload.seen ? 'read' : payload.delivered ? 'delivered' : 'sent',
            delivered: payload.delivered,
            seen: payload.seen,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: msgId,
            sender_id: senderId,
            text: msgText,
            createdAt,
            status: payload.seen ? 'read' : payload.delivered ? 'delivered' : 'sent',
            delivered: payload.delivered,
            seen: payload.seen,
          },
        ];
      });
    });
  }, [onMessageReceived, selectedConversationId, user?.id]);

  // Listen for message seen updates (when the recipient reads messages)
  useEffect(() => {
    return onMessageSeenUpdate?.((payload: any) => {
      const msgId = String(payload?.messageId ?? '');
      if (!msgId) return;
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, seen: true, status: 'read' }
            : m
        )
      );
    });
  }, [onMessageSeenUpdate]);

  const handleSelectConversation = (id: string) => {
    if (selectedConversationId) leaveConversation(selectedConversationId);
    setSelectedConversationId(id);
    setMessages([]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, unread_count: 0 } : c
      )
    );
    joinConversation(id);
  };

  const handleTyping = (isStart: boolean) => {
    if (!selectedConversationId) return;
    if (!user?.id) return;
    if (isStart) emitTypingStart(selectedConversationId);
    else emitTypingStop(selectedConversationId);
  };

  const handleSendMessage = () => {
    const text = newMessage.trim();
    if (!text || !selectedConversationId) return;

    setSending(true);

    const optimistic: MessageRow = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender_id: String(user?.id ?? ''),
      text,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');

    sendMessage(selectedConversationId, text);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? { ...c, last_message: text, last_at: new Date().toISOString(), unread_count: 0 }
          : c
      )
    );

    setSending(false);
    handleTyping(false);
  };

  const handleNewMessageChange = (v: string) => {
    setNewMessage(v);
    if (!selectedConversationId) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (v.trim().length > 0) {
      handleTyping(true);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1200);
    } else {
      handleTyping(false);
    }
  };

  const messagesByDate = useMemo(() => {
    const groups: Record<string, MessageRow[]> = {};
    messages.forEach((msg) => {
      const date = formatDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }, [messages]);

  const renderMessageStatus = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-white/80" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-white/80" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-white" />;
      default:
        return null;
    }
  };

  const renderMessageTicks = (msg: MessageRow) => {
    if (msg.seen) {
      return <CheckCheck className="h-3 w-3 text-white" />;
    }
    if (msg.delivered) {
      return <CheckCheck className="h-3 w-3 text-white/80" />;
    }
    return <Check className="h-3 w-3 text-white/80" />;
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-foreground">Messages</h2>
        <p className="text-muted-foreground">Communicate with your healthcare providers</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="card-elevated flex flex-col min-h-0">
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredConversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedConversationId === conv.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{initials(conv.doctor_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground text-sm truncate">{conv.doctor_name}</h4>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm">
                              {conv.unread_count > 99 ? "99+" : conv.unread_count}
                            </span>
                          )}
                          {conv.last_at && (
                            <span className="text-xs text-muted-foreground">{formatTime(conv.last_at)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{conv.specialty}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{conv.last_message || 'No messages'}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card-elevated flex flex-col min-h-0">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{initials(selectedConversation.doctor_name)}</span>
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                      otherUserOnline ? 'bg-success' : 'bg-muted'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{selectedConversation.doctor_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {otherUserOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
                {Object.entries(messagesByDate).map(([date, dateMessages]) => (
                  <div key={date} className="mb-4">
                    <div className="flex justify-center mb-2">
                      <span className="text-xs bg-muted/50 px-3 py-1 rounded-full text-muted-foreground shadow-sm">
                        {date}
                      </span>
                    </div>
                    {dateMessages.map((msg) => {
                      const isMe = user?.id ? String(msg.sender_id) === String(user.id) : false;
                      return (
                        <div key={msg.id} className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[70%] group">
                            <div
                              className={`px-3 py-2 rounded-lg ${
                                isMe
                                  ? 'bg-blue-500 text-white rounded-tr-none'
                                  : 'bg-sky-50 text-sky-950 dark:bg-sky-100 dark:text-sky-950 rounded-tl-none'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                              <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                <span
                                  className={`text-[10px] ${
                                    isMe ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
                                  }`}
                                >
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isMe && renderMessageTicks(msg)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex justify-start mb-2">
                        <div className="bg-card text-muted-foreground px-4 py-2 rounded-lg rounded-tl-none">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" type="button" disabled>
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Textarea
                    placeholder="Type your message…"
                    value={newMessage}
                    onChange={(e) => handleNewMessageChange(e.target.value)}
                    className="min-h-[44px] max-h-[120px] resize-none flex-1"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center min-h-0">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No conversation selected</h3>
                <p className="text-sm text-muted-foreground">Select a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


