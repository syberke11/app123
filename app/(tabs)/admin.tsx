import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings, Users, BookOpen, ChartBar as BarChart3, Database, Shield } from 'lucide-react-native';

interface AdminStats {
  totalUsers: number;
  totalOrganizes: number;
  totalSetoran: number;
  pendingSetoran: number;
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOrganizes: 0,
    totalSetoran: 0,
    pendingSetoran: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get total organizes
      const { count: organizesCount } = await supabase
        .from('organizes')
        .select('*', { count: 'exact', head: true });

      // Get total setoran
      const { count: setoranCount } = await supabase
        .from('setoran')
        .select('*', { count: 'exact', head: true });

      // Get pending setoran
      const { count: pendingCount } = await supabase
        .from('setoran')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: usersCount || 0,
        totalOrganizes: organizesCount || 0,
        totalSetoran: setoranCount || 0,
        pendingSetoran: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminStats();
    }
  }, [profile]);

  const adminMenus = [
    {
      title: 'Manajemen User',
      subtitle: 'Kelola pengguna sistem',
      icon: Users,
      color: '#3B82F6',
      onPress: () => {},
    },
    {
      title: 'Kelola Kelas',
      subtitle: 'Monitor semua kelas',
      icon: BookOpen,
      color: '#10B981',
      onPress: () => {},
    },
    {
      title: 'Laporan & Statistik',
      subtitle: 'Analisis data sistem',
      icon: BarChart3,
      color: '#8B5CF6',
      onPress: () => {},
    },
    {
      title: 'Backup Database',
      subtitle: 'Kelola data sistem',
      icon: Database,
      color: '#F59E0B',
      onPress: () => {},
    },
    {
      title: 'Keamanan',
      subtitle: 'Pengaturan keamanan',
      icon: Shield,
      color: '#EF4444',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Settings size={32} color="#EF4444" />
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <Text style={styles.headerSubtitle}>Kelola seluruh sistem</Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={20} color="#3B82F6" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total User</Text>
        </View>
        <View style={styles.statCard}>
          <BookOpen size={20} color="#10B981" />
          <Text style={styles.statNumber}>{stats.totalOrganizes}</Text>
          <Text style={styles.statLabel}>Kelas Aktif</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <BarChart3 size={20} color="#8B5CF6" />
          <Text style={styles.statNumber}>{stats.totalSetoran}</Text>
          <Text style={styles.statLabel}>Total Setoran</Text>
        </View>
        <View style={styles.statCard}>
          <Settings size={20} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pendingSetoran}</Text>
          <Text style={styles.statLabel}>Perlu Review</Text>
        </View>
      </View>

      {/* Admin Menus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Administrasi</Text>
        
        <View style={styles.menuList}>
          {adminMenus.map((menu, index) => (
            <Pressable 
              key={index} 
              style={styles.menuCard}
              onPress={menu.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: menu.color }]}>
                <menu.icon size={24} color="white" />
              </View>
              
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{menu.title}</Text>
                <Text style={styles.menuSubtitle}>{menu.subtitle}</Text>
              </View>
              
              <View style={styles.menuArrow}>
                <Text style={styles.menuArrowText}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* System Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Sistem</Text>
        
        <View style={styles.systemInfoCard}>
          <View style={styles.systemInfoItem}>
            <Text style={styles.systemInfoLabel}>Versi Aplikasi</Text>
            <Text style={styles.systemInfoValue}>1.0.0</Text>
          </View>
          <View style={styles.systemInfoItem}>
            <Text style={styles.systemInfoLabel}>Database</Text>
            <Text style={styles.systemInfoValue}>Supabase</Text>
          </View>
          <View style={styles.systemInfoItem}>
            <Text style={styles.systemInfoLabel}>Status</Text>
            <Text style={[styles.systemInfoValue, { color: '#10B981' }]}>Online</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  menuArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuArrowText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  systemInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  systemInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  systemInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  systemInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});