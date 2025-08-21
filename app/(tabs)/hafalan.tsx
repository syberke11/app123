import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Calendar, Clock, CircleCheck as CheckCircle, Circle as XCircle, FileAudio, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { AudioPlayer } from '@/components/AudioPlayer';

const { width, height } = Dimensions.get('window');

interface SetoranItem {
  id: string;
  jenis: 'hafalan' | 'murojaah';
  surah: string;
  juz: number;
  ayat_mulai?: number;
  ayat_selesai?: number;
  tanggal: string;
  status: 'pending' | 'diterima' | 'ditolak';
  catatan?: string;
  poin: number;
  file_url: string;
}

export default function HafalanScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [mySetoran, setMySetoran] = useState<SetoranItem[]>([]);
  const [stats, setStats] = useState({
    totalSetoran: 0,
    setoranDiterima: 0,
    setoranPending: 0,
    totalPoin: 0,
    hafalanCount: 0,
    murojaahCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMySetoran = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('setoran')
        .select('*')
        .eq('siswa_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching setoran:', error);
        return;
      }

      const setoranData = data || [];
      setMySetoran(setoranData);

      // Calculate stats
      const totalSetoran = setoranData.length;
      const setoranDiterima = setoranData.filter(s => s.status === 'diterima').length;
      const setoranPending = setoranData.filter(s => s.status === 'pending').length;
      const totalPoin = setoranData.reduce((sum, s) => sum + s.poin, 0);
      const hafalanCount = setoranData.filter(s => s.jenis === 'hafalan' && s.status === 'diterima').length;
      const murojaahCount = setoranData.filter(s => s.jenis === 'murojaah' && s.status === 'diterima').length;

      setStats({
        totalSetoran,
        setoranDiterima,
        setoranPending,
        totalPoin,
        hafalanCount,
        murojaahCount,
      });
    } catch (error) {
      console.error('Error in fetchMySetoran:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMySetoran();
  };

  useEffect(() => {
    fetchMySetoran();
  }, [profile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'diterima': return '#10B981';
      case 'ditolak': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'diterima': return CheckCircle;
      case 'ditolak': return XCircle;
      default: return Clock;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'diterima': return 'Diterima';
      case 'ditolak': return 'Ditolak';
      default: return status;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View 
        entering={FadeInUp.delay(100)}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerIcon}>
            <BookOpen size={32} color="white" />
          </View>
          <Text style={styles.headerTitle}>Hafalan & Murojaah</Text>
          <Text style={styles.headerSubtitle}>Pantau progress setoran Anda</Text>
        </LinearGradient>
      </Animated.View>

      {/* Stats Cards */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <TrendingUp size={20} color="#10B981" />
          <Text style={styles.statNumber}>{stats.totalPoin}</Text>
          <Text style={styles.statLabel}>Total Poin</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.statNumber}>{stats.setoranDiterima}</Text>
          <Text style={styles.statLabel}>Diterima</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.setoranPending}</Text>
          <Text style={styles.statLabel}>Menunggu</Text>
        </View>
      </Animated.View>

      {/* Progress Cards */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Progress Pembelajaran</Text>
        <View style={styles.progressCards}>
          <View style={styles.progressCard}>
            <BookOpen size={20} color="#10B981" />
            <Text style={styles.progressTitle}>Hafalan</Text>
            <Text style={styles.progressNumber}>{stats.hafalanCount}</Text>
            <Text style={styles.progressLabel}>Setoran Diterima</Text>
          </View>
          <View style={styles.progressCard}>
            <FileAudio size={20} color="#3B82F6" />
            <Text style={styles.progressTitle}>Murojaah</Text>
            <Text style={styles.progressNumber}>{stats.murojaahCount}</Text>
            <Text style={styles.progressLabel}>Setoran Diterima</Text>
          </View>
        </View>
      </Animated.View>

      {/* Setoran List */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Riwayat Setoran</Text>
        {mySetoran.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada setoran</Text>
            <Text style={styles.emptySubtext}>Mulai kirim setoran hafalan atau murojaah Anda</Text>
          </View>
        ) : (
          <View style={styles.setoranList}>
            {mySetoran.map((setoran, index) => {
              const StatusIcon = getStatusIcon(setoran.status);
              return (
                <Animated.View 
                  key={setoran.id} 
                  entering={SlideInRight.delay(index * 100)}
                  style={styles.setoranCard}
                >
                  <View style={styles.setoranHeader}>
                    <View style={[styles.setoranType, { backgroundColor: setoran.jenis === 'hafalan' ? '#10B981' : '#3B82F6' }]}>
                      <Text style={styles.setoranTypeText}>
                        {setoran.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(setoran.status) + '20' }]}>
                      <StatusIcon size={12} color={getStatusColor(setoran.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(setoran.status) }]}>
                        {getStatusText(setoran.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.setoranTitle}>{setoran.surah}</Text>
                  <Text style={styles.setoranDetails}>
                    Juz {setoran.juz}
                    {setoran.ayat_mulai && setoran.ayat_selesai && 
                      ` • Ayat ${setoran.ayat_mulai}-${setoran.ayat_selesai}`
                    }
                  </Text>
                  
                  <View style={styles.setoranFooter}>
                    <View style={styles.setoranDate}>
                      <Calendar size={12} color="#6B7280" />
                      <Text style={styles.setoranDateText}>
                        {new Date(setoran.tanggal).toLocaleDateString('id-ID')}
                      </Text>
                    </View>
                    {setoran.poin > 0 && (
                      <Text style={styles.setoranPoin}>+{setoran.poin} poin</Text>
                    )}
                  </View>

                  {setoran.catatan && (
                    <View style={styles.catatanContainer}>
                      <Text style={styles.catatanLabel}>Catatan Guru:</Text>
                      <Text style={styles.setoranCatatan}>{setoran.catatan}</Text>
                    </View>
                  )}

                  {/* Audio Player */}
                  <AudioPlayer 
                    fileUrl={setoran.file_url} 
                    title={`${setoran.jenis} - ${setoran.surah}`}
                  />
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerGradient: {
    paddingHorizontal: Math.max(24, width * 0.05),
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: Math.min(16, width * 0.04),
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Math.max(16, width * 0.04),
    paddingVertical: 20,
    gap: Math.max(12, width * 0.03),
    marginTop: -16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statNumber: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressSection: {
    marginHorizontal: Math.max(16, width * 0.04),
    marginBottom: 24,
  },
  progressCards: {
    flexDirection: 'row',
    gap: Math.max(12, width * 0.03),
  },
  progressCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  progressTitle: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressNumber: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressLabel: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: Math.max(16, width * 0.04),
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(40, width * 0.1),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: Math.min(14, width * 0.035),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  setoranList: {
    gap: Math.max(12, width * 0.03),
  },
  setoranCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  setoranHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setoranType: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setoranTypeText: {
    color: 'white',
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '600',
  },
  setoranTitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  setoranDetails: {
    fontSize: Math.min(14, width * 0.035),
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  setoranFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  setoranDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setoranDateText: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    fontWeight: '500',
  },
  setoranPoin: {
    fontSize: Math.min(12, width * 0.03),
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catatanContainer: {
    backgroundColor: '#F8FAFC',
    padding: Math.max(12, width * 0.03),
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  catatanLabel: {
    fontSize: Math.min(12, width * 0.03),
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
  },
  setoranCatatan: {
    fontSize: Math.min(14, width * 0.035),
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});