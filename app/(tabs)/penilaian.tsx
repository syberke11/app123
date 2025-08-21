import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Calendar, CircleCheck as CheckCircle, Clock, FileAudio, Pause, Play, User, CircleX  } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SetoranPenilaian {
  id: string;
  siswa_id: string;
  jenis: 'hafalan' | 'murojaah';
  surah: string;
  juz: number;
  ayat_mulai?: number;
  ayat_selesai?: number;
  tanggal: string;
  status: 'pending' | 'diterima' | 'ditolak';
  catatan?: string;
  file_url: string;
  siswa: {
    name: string;
  };
}

export default function PenilaianScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [setoranList, setSetoranList] = useState<SetoranPenilaian[]>([]);
  const [selectedSetoran, setSelectedSetoran] = useState<SetoranPenilaian | null>(null);
  const [catatan, setCatatan] = useState('');
  const [poin, setPoin] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSetoranPending = async () => {
    if (!profile?.organize_id) return;

    try {
      const { data, error } = await supabase
        .from('setoran')
        .select(`
          *,
          siswa:siswa_id(name)
        `)
        .eq('organize_id', profile.organize_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching setoran:', error);
        return;
      }

      setSetoranList(data || []);
    } catch (error) {
      console.error('Error in fetchSetoranPending:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePenilaian = async (status: 'diterima' | 'ditolak') => {
    if (!selectedSetoran) return;

    const poinValue = status === 'diterima' ? parseInt(poin) || 10 : 0;

    try {
      // Update setoran status
      const { error } = await supabase
        .from('setoran')
        .update({
          status: status,
          catatan: catatan,
          poin: poinValue,
          guru_id: profile?.id,
        })
        .eq('id', selectedSetoran.id);

      if (error) {
        Alert.alert('Error', 'Gagal menyimpan penilaian');
        return;
      }

      // Update student points if accepted
      if (status === 'diterima' && poinValue > 0) {
        const { data: currentPoints } = await supabase
          .from('siswa_poin')
          .select('*')
          .eq('siswa_id', selectedSetoran.siswa_id)
          .single();

        if (currentPoints) {
          await supabase
            .from('siswa_poin')
            .update({
              total_poin: currentPoints.total_poin + poinValue,
              poin_hafalan: currentPoints.poin_hafalan + poinValue,
            })
            .eq('siswa_id', selectedSetoran.siswa_id);
        } else {
          // Create new points record
          await supabase
            .from('siswa_poin')
            .insert([{
              siswa_id: selectedSetoran.siswa_id,
              total_poin: poinValue,
              poin_hafalan: poinValue,
              poin_quiz: 0,
            }]);
        }

        // Check if student completed a juz (auto label)
        if (selectedSetoran.juz) {
          await checkAndCreateLabel(selectedSetoran.siswa_id, selectedSetoran.juz);
        }
      }

      Alert.alert('Sukses', `Setoran ${status === 'diterima' ? 'diterima' : 'ditolak'} dan poin telah diperbarui!`);
      setSelectedSetoran(null);
      setCatatan('');
      setPoin('');
      fetchSetoranPending();
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan penilaian');
    }
  };

  const checkAndCreateLabel = async (siswaId: string, juz: number) => {
    try {
      // Check if student already has this juz label
      const { data: existingLabel } = await supabase
        .from('labels')
        .select('*')
        .eq('siswa_id', siswaId)
        .eq('juz', juz)
        .single();

      if (!existingLabel) {
        // Create new label
        await supabase
          .from('labels')
          .insert([{
            siswa_id: siswaId,
            juz: juz,
            diberikan_oleh: profile?.id,
            keterangan: `Juz ${juz} selesai - Hafalan diterima`,
          }]);
      }
    } catch (error) {
      console.error('Error creating label:', error);
    }
  };

  const playAudio = () => {
    // In real app, implement audio player
    setIsPlaying(!isPlaying);
    Alert.alert('Audio Player', 'Fitur pemutar audio akan diimplementasikan');
  };

  useEffect(() => {
    fetchSetoranPending();
  }, [profile]);

  if (selectedSetoran) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeInUp} style={styles.penilaianHeader}>
          <Text style={styles.penilaianTitle}>Penilaian Setoran</Text>
          <Pressable onPress={() => setSelectedSetoran(null)} style={styles.backButton}>
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
        </Animated.View>

        <ScrollView style={styles.penilaianContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.setoranDetail}>
            <Text style={styles.siswaName}>{selectedSetoran.siswa.name}</Text>
            <Text style={styles.setoranInfo}>
              {selectedSetoran.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'} - {selectedSetoran.surah}
            </Text>
            <Text style={styles.setoranJuz}>
              Juz {selectedSetoran.juz}
              {selectedSetoran.ayat_mulai && selectedSetoran.ayat_selesai && 
                ` • Ayat ${selectedSetoran.ayat_mulai}-${selectedSetoran.ayat_selesai}`
              }
            </Text>
            <Text style={styles.setoranDateLabel}>
              {new Date(selectedSetoran.tanggal).toLocaleDateString('id-ID')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.audioSection}>
            <Text style={styles.audioSectionTitle}>Audio Setoran</Text>
            <AudioPlayer 
              fileUrl={selectedSetoran.file_url}
              title={`${selectedSetoran.jenis} - ${selectedSetoran.surah}`}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.penilaianForm}>
            <Text style={styles.formLabel}>Catatan Penilaian</Text>
            <TextInput
              style={styles.catatanInput}
              placeholder="Berikan catatan untuk siswa..."
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.formLabel}>Poin (default: 10)</Text>
            <TextInput
              style={styles.poinInput}
              placeholder="10"
              value={poin}
              onChangeText={setPoin}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.penilaianActions}>
              <Pressable 
                style={[styles.penilaianButton, styles.tolakButton]}
                onPress={() => handlePenilaian('ditolak')}
              >
                <CircleX  size={20} color="white" />
                <Text style={styles.penilaianButtonText}>Tolak</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.penilaianButton, styles.terimaButton]}
                onPress={() => handlePenilaian('diterima')}
              >
                <CheckCircle size={20} color="white" />
                <Text style={styles.penilaianButtonText}>Terima</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View entering={FadeInUp} style={styles.header}>
        <View style={styles.headerIcon}>
          <Clock size={32} color="white" />
        </View>
        <Text style={styles.headerTitle}>Penilaian Setoran</Text>
        <Text style={styles.headerSubtitle}>
          {setoranList.length} setoran menunggu penilaian
        </Text>
      </Animated.View>

      {/* Setoran List */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
        {setoranList.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={48} color="#10B981" />
            <Text style={styles.emptyText}>Semua setoran sudah dinilai</Text>
            <Text style={styles.emptySubtext}>Tidak ada setoran yang menunggu penilaian</Text>
          </View>
        ) : (
          <View style={styles.setoranList}>
            {setoranList.map((setoran, index) => (
              <Animated.View
                key={setoran.id} 
                entering={FadeInDown.delay(index * 100)}
              >
                <Pressable 
                  style={styles.setoranCard}
                  onPress={() => setSelectedSetoran(setoran)}
                >
                  <View style={styles.setoranCardHeader}>
                    <View style={styles.siswaInfo}>
                      <User size={16} color="#6B7280" />
                      <Text style={styles.siswaNameText}>{setoran.siswa.name}</Text>
                    </View>
                    <View style={[styles.setoranType, { backgroundColor: setoran.jenis === 'hafalan' ? '#10B981' : '#3B82F6' }]}>
                      <Text style={styles.setoranTypeText}>
                        {setoran.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.setoranTitle}>{setoran.surah}</Text>
                  <Text style={styles.setoranJuzText}>
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
                    <View style={styles.pendingBadge}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={styles.pendingText}>Menunggu</Text>
                    </View>
                  </View>

                  <View style={styles.audioPreview}>
                    <FileAudio size={14} color="#10B981" />
                    <Text style={styles.audioPreviewText}>Klik untuk mendengar & nilai</Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
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
    backgroundColor: '#F59E0B',
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
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
  },
  section: {
    margin: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  setoranList: {
    gap: 12,
  },
  setoranCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  setoranCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  siswaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siswaNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  setoranType: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setoranTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  setoranTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  setoranJuzText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  setoranFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setoranDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setoranDateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  audioPreviewText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  // Penilaian Detail Styles
  penilaianHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  penilaianTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  backButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  penilaianContent: {
    flex: 1,
    padding: 16,
  },
  setoranDetail: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  siswaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  setoranInfo: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  setoranJuz: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
    fontWeight: '500',
  },
  setoranDateLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  audioSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  audioSectionTitle: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  penilaianForm: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  catatanInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#1F2937',
  },
  poinInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1F2937',
  },
  penilaianActions: {
    flexDirection: 'row',
    gap: 16,
  },
  penilaianButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  tolakButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  terimaButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  penilaianButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});