import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Award, BookOpen, LogOut, Settings, Shield, Trophy, User } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { TeamSection } from '@/components/TeamSection';
import { AppLogo } from '@/components/AppLogo';

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizeInfo, setOrganizeInfo] = useState<any>(null);

  const fetchOrganizeInfo = async () => {
    if (!profile?.organize_id) return;

    try {
      const { data, error } = await supabase
        .from('organizes')
        .select('name, description, code')
        .eq('id', profile.organize_id)
        .single();

      if (!error && data) {
        setOrganizeInfo(data);
      }
    } catch (error) {
      console.error('Error fetching organize info:', error);
    }
  };

  useEffect(() => {
    fetchOrganizeInfo();
  }, [profile]);

  const handleSignOut = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'siswa': return 'Siswa';
      case 'guru': return 'Guru';
      case 'ortu': return 'Orang Tua';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getTypeName = (type?: string) => {
    if (!type) return 'Tidak ditentukan';
    switch (type) {
      case 'normal': return 'Normal';
      case 'cadel': return 'Cadel';
      case 'school': return 'Sekolah';
      case 'personal': return 'Personal';
      default: return type;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={48} color="white" />
        </View>
        <Text style={styles.userName}>{profile?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Akun</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Shield size={20} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{getRoleName(profile?.role || '')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Settings size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipe</Text>
              <Text style={styles.infoValue}>{getTypeName(profile?.type)}</Text>
            </View>
          </View>

          {organizeInfo && (
            <View style={styles.infoItem}>
              <BookOpen size={20} color="#3B82F6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Kelas</Text>
                <Text style={styles.infoValue}>{organizeInfo.name}</Text>
                <Text style={styles.infoSubValue}>Kode: {organizeInfo.code}</Text>
              </View>
            </View>
          )}
        </View>
      </View>


      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pengaturan</Text>
        
        <View style={styles.actionsContainer}>
          <Pressable style={styles.actionButton}>
            <User size={20} color="#6B7280" />
            <Text style={styles.actionText}>Edit Profil</Text>
          </Pressable>
          
          <Pressable style={styles.actionButton}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.actionText}>Pengaturan</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleSignOut}
            disabled={loading}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={[styles.actionText, styles.logoutText]}>
              {loading ? 'Memproses...' : 'Keluar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
        
        <View style={styles.appInfoCard}>
          <AppLogo size="medium" showText={false} />
          <Text style={styles.appName}>IQRO</Text>
          <Text style={styles.appVersion}>Versi 1.0.0</Text>
          <Text style={styles.appDescription}>
            Platform pembelajaran Quran digital untuk hafalan, murojaah, dan monitoring perkembangan siswa.
          </Text>
        </View>
      </View>

      {/* Team Section */}
      <TeamSection />
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
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#10B981',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  infoSubValue: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  achievementContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  achievementCard: {
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
  achievementNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  achievementLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#EF4444',
  },
  appInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});