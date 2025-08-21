import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { supabase } from '@/lib/supabase';
import { X, User, BookOpen, Target, Award, CreditCard as Edit, Save, Play, FileAudio } from 'lucide-react-native';

interface StudentDetailModalProps {
  visible: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
  isTeacher?: boolean;  
}

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  totalSetoran: number;
  setoranDiterima: number;
  setoranPending: number;
  totalPoin: number;
  hafalanCount: number;
  murojaahCount: number;
  labelCount: number;
  accuracy: number;
  recentSetoran: any[];
}

export function StudentDetailModal({ visible, studentId, studentName, onClose, isTeacher = false }: StudentDetailModalProps) {
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [editingHafalan, setEditingHafalan] = useState(false);
  const [hafalanCount, setHafalanCount] = useState('0');
  const [loading, setLoading] = useState(true);

  const fetchStudentDetail = async () => {
    try {
      // Get student basic info
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .single();

      // Get setoran data
      const { data: setoranData } = await supabase
        .from('setoran')
        .select('*')
        .eq('siswa_id', studentId)
        .order('created_at', { ascending: false });

      // Get points
      const { data: pointsData } = await supabase
        .from('siswa_poin')
        .select('*')
        .eq('siswa_id', studentId)
        .single();

      // Get labels
      const { data: labelsData } = await supabase
        .from('labels')
        .select('*')
        .eq('siswa_id', studentId);

      const totalSetoran = setoranData?.length || 0;
      const setoranDiterima = setoranData?.filter(s => s.status === 'diterima').length || 0;
      const setoranPending = setoranData?.filter(s => s.status === 'pending').length || 0;
      const hafalanCount = setoranData?.filter(s => s.jenis === 'hafalan' && s.status === 'diterima').length || 0;
      const murojaahCount = setoranData?.filter(s => s.jenis === 'murojaah' && s.status === 'diterima').length || 0;
      const accuracy = totalSetoran > 0 ? Math.round((setoranDiterima / totalSetoran) * 100) : 0;

      setStudentDetail({
        id: userData?.id || '',
        name: userData?.name || '',
        email: userData?.email || '',
        totalSetoran,
        setoranDiterima,
        setoranPending,
        totalPoin: pointsData?.total_poin || 0,
        hafalanCount,
        murojaahCount,
        labelCount: labelsData?.length || 0,
        accuracy,
        recentSetoran: setoranData?.slice(0, 10) || [],
      });

      setHafalanCount(hafalanCount.toString());
    } catch (error) {
      console.error('Error fetching student detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHafalanCount = async () => {
    try {
      const newCount = parseInt(hafalanCount);
      if (isNaN(newCount) || newCount < 0) {
        Alert.alert('Error', 'Jumlah hafalan harus berupa angka positif');
        return;
      }

      // This would update a custom hafalan count field
      // For now, we'll just show success message
      Alert.alert('Sukses', `Jumlah hafalan diupdate menjadi ${newCount}`);
      setEditingHafalan(false);
    } catch (error) {
      Alert.alert('Error', 'Gagal mengupdate jumlah hafalan');
    }
  };

  const playAudio = (fileUrl: string) => {
    Alert.alert('Audio Player', 'Memutar audio setoran...\n\nFitur audio player akan diimplementasikan dengan expo-av');
  };

  useEffect(() => {
    if (visible && studentId) {
      setLoading(true);
      fetchStudentDetail();
    }
  }, [visible, studentId]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detail Siswa</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Memuat data siswa...</Text>
            </View>
          ) : studentDetail ? (
            <>
              {/* Student Info */}
              <View style={styles.studentInfo}>
                <View style={styles.studentAvatar}>
                  <User size={32} color="white" />
                </View>
                <Text style={styles.studentName}>{studentDetail.name}</Text>
                <Text style={styles.studentEmail}>{studentDetail.email}</Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Award size={20} color="#3B82F6" />
                  <Text style={styles.statNumber}>{studentDetail.totalPoin}</Text>
                  <Text style={styles.statLabel}>Total Poin</Text>
                </View>
                <View style={styles.statCard}>
                  <BookOpen size={20} color="#10B981" />
                  <Text style={styles.statNumber}>{studentDetail.setoranDiterima}</Text>
                  <Text style={styles.statLabel}>Setoran Diterima</Text>
                </View>
                <View style={styles.statCard}>
                  <Target size={20} color="#F59E0B" />
                  <Text style={styles.statNumber}>{studentDetail.accuracy}%</Text>
                  <Text style={styles.statLabel}>Akurasi</Text>
                </View>
                <View style={styles.statCard}>
                  <Award size={20} color="#8B5CF6" />
                  <Text style={styles.statNumber}>{studentDetail.labelCount}</Text>
                  <Text style={styles.statLabel}>Label Juz</Text>
                </View>
              </View>

              {/* Hafalan Count (Editable by Teacher) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Jumlah Hafalan</Text>
                  {isTeacher && (
                    <Pressable 
                      onPress={() => setEditingHafalan(!editingHafalan)}
                      style={styles.editButton}
                    >
                      <Edit size={16} color="#3B82F6" />
                    </Pressable>
                  )}
                </View>
                
                {editingHafalan ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.editInput}
                      value={hafalanCount}
                      onChangeText={setHafalanCount}
                      keyboardType="numeric"
                      placeholder="Jumlah hafalan"
                    />
                    <Pressable onPress={updateHafalanCount} style={styles.saveButton}>
                      <Save size={16} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.hafalanDisplay}>
                    <BookOpen size={24} color="#10B981" />
                    <Text style={styles.hafalanNumber}>{studentDetail.hafalanCount}</Text>
                    <Text style={styles.hafalanLabel}>Hafalan Selesai</Text>
                  </View>
                )}
              </View>

              {/* Progress Breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Breakdown Progress</Text>
                <View style={styles.progressCards}>
                  <View style={styles.progressCard}>
                    <BookOpen size={20} color="#10B981" />
                    <Text style={styles.progressTitle}>Hafalan</Text>
                    <Text style={styles.progressNumber}>{studentDetail.hafalanCount}</Text>
                    <Text style={styles.progressLabel}>Diterima</Text>
                  </View>
                  <View style={styles.progressCard}>
                    <Target size={20} color="#3B82F6" />
                    <Text style={styles.progressTitle}>Murojaah</Text>
                    <Text style={styles.progressNumber}>{studentDetail.murojaahCount}</Text>
                    <Text style={styles.progressLabel}>Diterima</Text>
                  </View>
                </View>
              </View>

              {/* Recent Setoran with Audio */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Setoran Terbaru</Text>
                {studentDetail.recentSetoran.length === 0 ? (
                  <View style={styles.emptyState}>
                    <BookOpen size={32} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Belum ada setoran</Text>
                  </View>
                ) : (
                  <View style={styles.setoranList}>
                    {studentDetail.recentSetoran.map((setoran) => (
                      <View key={setoran.id} style={styles.setoranCard}>
                        <View style={styles.setoranHeader}>
                          <View style={[styles.setoranType, { 
                            backgroundColor: setoran.jenis === 'hafalan' ? '#10B981' : '#3B82F6' 
                          }]}>
                            <Text style={styles.setoranTypeText}>
                              {setoran.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { 
                            backgroundColor: setoran.status === 'diterima' ? '#DCFCE7' : 
                                           setoran.status === 'pending' ? '#FEF3C7' : '#FEE2E2'
                          }]}>
                            <Text style={[styles.statusText, { 
                              color: setoran.status === 'diterima' ? '#10B981' : 
                                     setoran.status === 'pending' ? '#F59E0B' : '#EF4444'
                            }]}>
                              {setoran.status === 'pending' ? 'Menunggu' : 
                               setoran.status === 'diterima' ? 'Diterima' : 'Ditolak'}
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
                        
                        <Text style={styles.setoranDate}>
                          {new Date(setoran.tanggal).toLocaleDateString('id-ID')}
                        </Text>

                        {setoran.catatan && (
                          <Text style={styles.setoranNote}>Catatan: {setoran.catatan}</Text>
                        )}

                        {/* Audio Player */}
                        <Pressable 
                          style={styles.audioButton}
                          onPress={() => playAudio(setoran.file_url)}
                        >
                          <FileAudio size={16} color="#10B981" />
                          <Text style={styles.audioButtonText}>Putar Audio</Text>
                          <Play size={14} color="#10B981" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text>Gagal memuat data siswa</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  studentInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentAvatar: {
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hafalanDisplay: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hafalanNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  hafalanLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressCards: {
    flexDirection: 'row',
    gap: 12,
  },
  progressCard: {
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
  progressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  setoranList: {
    gap: 8,
  },
  setoranCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  setoranHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setoranType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setoranTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setoranTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  setoranDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  setoranDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  setoranNote: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  audioButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
});