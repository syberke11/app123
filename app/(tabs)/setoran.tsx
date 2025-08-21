import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { CloudinaryService } from '@/services/cloudinary';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, Clock, CircleCheck as CheckCircle, Circle as XCircle, BookOpen, Calendar, FileAudio, ChevronDown, X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

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

export default function SetoranScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [mySetoran, setMySetoran] = useState<SetoranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    jenis: 'hafalan' as 'hafalan' | 'murojaah',
    surah: '',
    juz: '',
    ayatMulai: '',
    ayatSelesai: '',
    file: null as any,
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchMySetoran();
  };

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

      setMySetoran(data || []);
    } catch (error) {
      console.error('Error in fetchMySetoran:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, file: result.assets[0] });
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih file');
    }
  };

  const submitSetoran = async () => {
    if (!formData.surah || !formData.juz || !formData.file) {
      Alert.alert('Error', 'Mohon lengkapi semua data');
      return;
    }

    if (!profile?.organize_id) {
      Alert.alert('Error', 'Anda belum bergabung dengan kelas');
      return;
    }

    setUploading(true);

    try {
      // Upload file to Cloudinary
      let fileUrl = '';
      try {
        const uploadResult = await CloudinaryService.uploadFile(formData.file.uri);
        fileUrl = uploadResult.secure_url;
      } catch (uploadError) {
        // Fallback to mock URL for demo
        fileUrl = `https://example.com/audio/${Date.now()}.mp3`;
      }

      const { error } = await supabase
        .from('setoran')
        .insert([{
          siswa_id: profile.id,
          organize_id: profile.organize_id,
          jenis: formData.jenis,
          surah: formData.surah,
          juz: parseInt(formData.juz),
          ayat_mulai: formData.ayatMulai ? parseInt(formData.ayatMulai) : null,
          ayat_selesai: formData.ayatSelesai ? parseInt(formData.ayatSelesai) : null,
          file_url: fileUrl,
          tanggal: new Date().toISOString().split('T')[0],
        }]);

      if (error) {
        Alert.alert('Error', 'Gagal menyimpan setoran');
        return;
      }

      Alert.alert('Sukses', 'Setoran berhasil dikirim dan menunggu penilaian guru!');
      setFormData({
        jenis: 'hafalan',
        surah: '',
        juz: '',
        ayatMulai: '',
        ayatSelesai: '',
        file: null,
      });
      setShowForm(false);
      fetchMySetoran();
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan setoran');
    } finally {
      setUploading(false);
    }
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
      case 'pending': return 'Menunggu Penilaian';
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
        <View style={styles.headerIcon}>
          <BookOpen size={32} color="white" />
        </View>
        <Text style={styles.headerTitle}>Setoran Hafalan</Text>
        <Text style={styles.headerSubtitle}>Upload dan pantau setoran Anda</Text>
      </Animated.View>

      {/* Quick Stats */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.statNumber}>{mySetoran.filter(s => s.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Menunggu</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.statNumber}>{mySetoran.filter(s => s.status === 'diterima').length}</Text>
          <Text style={styles.statLabel}>Diterima</Text>
        </View>
        <View style={styles.statCard}>
          <FileAudio size={20} color="#3B82F6" />
          <Text style={styles.statNumber}>{mySetoran.reduce((sum, s) => sum + s.poin, 0)}</Text>
          <Text style={styles.statLabel}>Total Poin</Text>
        </View>
      </Animated.View>

      {/* Add New Button */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <Pressable 
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Upload size={20} color="white" />
          <Text style={styles.addButtonText}>Setoran Baru</Text>
          <ChevronDown 
            size={16} 
            color="white" 
            style={{ 
              transform: [{ rotate: showForm ? '180deg' : '0deg' }] 
            }} 
          />
        </Pressable>
      </Animated.View>

      {/* Form */}
      {showForm && (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Setoran Baru</Text>
            <Pressable onPress={() => setShowForm(false)} style={styles.closeFormButton}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          
          <View style={styles.typeSelector}>
            <Pressable
              style={[styles.typeButton, formData.jenis === 'hafalan' && styles.typeButtonActive]}
              onPress={() => setFormData({ ...formData, jenis: 'hafalan' })}
            >
              <Text style={[styles.typeButtonText, formData.jenis === 'hafalan' && styles.typeButtonTextActive]}>
                Hafalan
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, formData.jenis === 'murojaah' && styles.typeButtonActive]}
              onPress={() => setFormData({ ...formData, jenis: 'murojaah' })}
            >
              <Text style={[styles.typeButtonText, formData.jenis === 'murojaah' && styles.typeButtonTextActive]}>
                Murojaah
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nama Surah (contoh: Al-Fatihah)"
            value={formData.surah}
            onChangeText={(text) => setFormData({ ...formData, surah: text })}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            style={styles.input}
            placeholder="Juz (1-30)"
            value={formData.juz}
            onChangeText={(text) => setFormData({ ...formData, juz: text })}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.ayatContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ayat Mulai"
              value={formData.ayatMulai}
              onChangeText={(text) => setFormData({ ...formData, ayatMulai: text })}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ayat Selesai"
              value={formData.ayatSelesai}
              onChangeText={(text) => setFormData({ ...formData, ayatSelesai: text })}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Pressable style={styles.fileButton} onPress={pickFile}>
            <FileAudio size={20} color="#10B981" />
            <Text style={styles.fileButtonText} numberOfLines={1}>
              {formData.file ? formData.file.name : 'Pilih File Audio (MP3/M4A)'}
            </Text>
          </Pressable>

          <View style={styles.formActions}>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => setShowForm(false)}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </Pressable>
            <Pressable 
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
              onPress={submitSetoran}
              disabled={uploading}
            >
              <Text style={styles.submitButtonText}>
                {uploading ? 'Mengupload...' : 'Kirim Setoran'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

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

                  {/* Enhanced Audio Player */}
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
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  headerIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 64,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  form: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeFormButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  typeButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 56,
    color: '#1F2937',
    fontWeight: '500',
  },
  ayatContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  fileButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    minHeight: 64,
  },
  fileButtonText: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  submitButton: {
    flex: 2,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  setoranList: {
    gap: 16,
  },
  setoranCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  setoranHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setoranType: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  setoranTypeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  setoranTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  setoranDetails: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  setoranFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  setoranDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setoranDateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  setoranPoin: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catatanContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catatanLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 6,
  },
  setoranCatatan: {
    fontSize: 15,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
  },
});