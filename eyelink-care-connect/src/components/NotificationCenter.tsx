import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { cn } from '@/lib/utils';
import { formatRelative } from 'date-fns';

export type NotificationItem = {
  id: number;
  title: string;
  body: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  source?: string;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { notifications: socketNotifications, isConnected } = useSocket();

  const fetchNotifications = useCallback(async () => {
    if (!api.getToken()) return;
    setLoading(true);
    try {
      const res = await api.get<NotificationItem[]>('/api/notifications');
      if (res.success && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setNotifications(data);
        setUnreadCount(res.unreadCount ?? data.filter((n) => !n.read).length);
      }
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for real-time notifications from socket
  useEffect(() => {
    if (socketNotifications && socketNotifications.length > 0) {
      // Add new socket notifications to the top of the list
      const newNotifications: NotificationItem[] = socketNotifications.map((n: any) => ({
        id: n.id || Date.now(),
        title: n.title || 'Notification',
        body: n.body || null,
        type: n.type || 'info',
        read: false,
        createdAt: n.createdAt || new Date().toISOString(),
      }));
      
      // Avoid duplicates by checking if notification already exists
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const uniqueNew = newNotifications.filter((n) => !existingIds.has(n.id));
        return [...uniqueNew, ...prev];
      });
      
      // Update unread count, but keep message unread badges separate from the notification bell
      const notificationCount = socketNotifications.filter((n: any) => n.source !== 'message').length;
      setUnreadCount((prev) => prev + notificationCount);
    }
  }, [socketNotifications]);

  useEffect(() => {
    fetchNotifications();
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const iconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  };
  const typeClass = {
    info: 'text-blue-600 bg-blue-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-amber-600 bg-amber-100',
    error: 'text-destructive bg-destructive/10',
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 flex items-center justify-between">
          <p className="font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={async () => {
              for (const n of notifications.filter(n => !n.read)) {
                await markAsRead(n.id);
              }
            }}>
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = iconMap[n.type] || Info;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      'flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50',
                      !n.read && 'bg-muted/30'
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', typeClass[n.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium', !n.read && 'font-semibold')}>{n.title}</p>
                      {n.body && <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelative(new Date(n.createdAt), new Date())}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
