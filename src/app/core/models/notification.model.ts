export interface Notification {
  notificationId: number;
  userEmail: string;
  entityId?: number;
  message: string;
  category: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export interface NotificationRequest {
  userEmail: string;
  entityId?: number;
  message: string;
  category: string;
}
