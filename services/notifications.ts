import { supabase } from '@/lib/supabase';

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'warning' | 'info';
  is_read: boolean;
  created_at: string;
}

export class NotificationService {
  static async createNotification(
    userId: string, 
    title: string, 
    message: string, 
    type: 'reminder' | 'achievement' | 'warning' | 'info' = 'info'
  ) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type,
        }]);

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error in createNotification:', error);
    }
  }

  static async checkDailySetoran() {
    try {
      // Get all active students
      const { data: students } = await supabase
        .from('users')
        .select('id, name, organize_id')
        .eq('role', 'siswa')
        .not('organize_id', 'is', null);

      if (!students) return;

      const today = new Date().toISOString().split('T')[0];

      for (const student of students) {
        // Check if student has submitted setoran today
        const { data: todaySetoran } = await supabase
          .from('setoran')
          .select('id')
          .eq('siswa_id', student.id)
          .eq('tanggal', today);

        if (!todaySetoran || todaySetoran.length === 0) {
          // Create reminder notification
          await this.createNotification(
            student.id,
            'Reminder Setoran Harian',
            'Jangan lupa untuk mengirim setoran hafalan atau murojaah hari ini!',
            'reminder'
          );
        }
      }
    } catch (error) {
      console.error('Error checking daily setoran:', error);
    }
  }

  static async getUserNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}