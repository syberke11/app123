import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Calendar, CircleCheck as CheckCircle,CircleX, Clock } from 'lucide-react-native';

interface AttendanceTrackerProps {
  studentId: string;
  studentName: string;
  isTeacher?: boolean;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'hadir' | 'tidak_hadir' | 'izin';
  noted_by: string;
  created_at: string;
}

export function AttendanceTracker({ studentId, studentName, isTeacher = false }: AttendanceTrackerProps) {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching attendance:', error);
        return;
      }

      setTodayAttendance(data);
    } catch (error) {
      console.error('Error in fetchTodayAttendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (status: 'hadir' | 'tidak_hadir' | 'izin') => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      if (todayAttendance) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', todayAttendance.id);

        if (error) {
          Alert.alert('Error', 'Gagal mengupdate absensi');
          return;
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance')
          .insert([{
            student_id: studentId,
            date: today,
            status,
          }]);

        if (error) {
          Alert.alert('Error', 'Gagal menyimpan absensi');
          return;
        }
      }

      Alert.alert('Sukses', `Absensi ${studentName} berhasil dicatat sebagai ${status}`);
      fetchTodayAttendance();
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan absensi');
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [studentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return '#10B981';
      case 'tidak_hadir': return '#EF4444';
      case 'izin': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hadir': return CheckCircle;
      case 'tidak_hadir': return CircleX;
      case 'izin': return Clock;
      default: return Calendar;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Memuat absensi...</Text>
      </View>
    );
  }

  const StatusIcon = todayAttendance ? getStatusIcon(todayAttendance.status) : Calendar;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={16} color="#64748B" />
        <Text style={styles.title}>Absensi Hari Ini</Text>
      </View>

      {todayAttendance ? (
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(todayAttendance.status) }]}>
          <StatusIcon size={20} color={getStatusColor(todayAttendance.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(todayAttendance.status) }]}>
            {todayAttendance.status === 'hadir' ? 'Hadir' :
             todayAttendance.status === 'tidak_hadir' ? 'Tidak Hadir' : 'Izin'}
          </Text>
        </View>
      ) : (
        <Text style={styles.noAttendanceText}>Belum ada catatan absensi</Text>
      )}

      {isTeacher && (
        <View style={styles.actions}>
          <Pressable 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => markAttendance('hadir')}
          >
            <CheckCircle size={16} color="white" />
            <Text style={styles.actionText}>Hadir</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => markAttendance('izin')}
          >
            <Clock size={16} color="white" />
            <Text style={styles.actionText}>Izin</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() => markAttendance('tidak_hadir')}
          >
            <CircleX size={16} color="white" />
            <Text style={styles.actionText}>Tidak Hadir</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noAttendanceText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});