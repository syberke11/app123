import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StudentDetailModal } from '@/components/StudentDetailModal';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { Users, Plus, Settings, UserPlus, Copy, Eye, Calendar, ChartBar as BarChart3, UserMinus, Trash2, X } from 'lucide-react-native';

interface OrganizeData {
  id: string;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface OrganizeStats {
  totalStudents: number;
  totalSetoran: number;
  pendingSetoran: number;
  totalPoints: number;
  averageAccuracy: number;
}

export default function OrganizeScreen() {
  const { profile } = useAuth();
  const [organize, setOrganize] = useState<OrganizeData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [stats, setStats] = useState<OrganizeStats>({
    totalStudents: 0,
    totalSetoran: 0,
    pendingSetoran: 0,
    totalPoints: 0,
    averageAccuracy: 0,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<StudentData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);

  const fetchOrganize = async () => {
    if (!profile) return;

    try {
      if (profile.organize_id) {
        // Get existing organize
        const { data: organizeData, error } = await supabase
          .from('organizes')
          .select('*')
          .eq('id', profile.organize_id)
          .single();

        if (error) {
          console.error('Error fetching organize:', error);
          return;
        }

        setOrganize(organizeData);
        await fetchStudents(profile.organize_id);
        await fetchOrganizeStats(profile.organize_id);
      }
    } catch (error) {
      console.error('Error in fetchOrganize:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (organizeId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .eq('organize_id', organizeId)
        .eq('role', 'siswa')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Error in fetchStudents:', error);
    }
  };

  const fetchOrganizeStats = async (organizeId: string) => {
    try {
      // Get all setoran in organize
      const { data: setoranData } = await supabase
        .from('setoran')
        .select('*')
        .eq('organize_id', organizeId);

      // Get all student points in organize
      const { data: studentsInOrganize } = await supabase
        .from('users')
        .select('id')
        .eq('organize_id', organizeId)
        .eq('role', 'siswa');

      let totalPoints = 0;
      let totalAccuracy = 0;
      let studentsWithData = 0;

      if (studentsInOrganize) {
        for (const student of studentsInOrganize) {
          const { data: pointsData } = await supabase
            .from('siswa_poin')
            .select('total_poin')
            .eq('siswa_id', student.id)
            .single();

          if (pointsData) {
            totalPoints += pointsData.total_poin;
          }

          // Calculate accuracy for this student
          const studentSetoran = setoranData?.filter(s => s.siswa_id === student.id) || [];
          if (studentSetoran.length > 0) {
            const accepted = studentSetoran.filter(s => s.status === 'diterima').length;
            const accuracy = (accepted / studentSetoran.length) * 100;
            totalAccuracy += accuracy;
            studentsWithData++;
          }
        }
      }

      const averageAccuracy = studentsWithData > 0 ? Math.round(totalAccuracy / studentsWithData) : 0;

      setStats({
        totalStudents: students.length,
        totalSetoran: setoranData?.length || 0,
        pendingSetoran: setoranData?.filter(s => s.status === 'pending').length || 0,
        totalPoints,
        averageAccuracy,
      });
    } catch (error) {
      console.error('Error fetching organize stats:', error);
    }
  };

  const generateClassCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createOrganize = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama kelas harus diisi');
      return;
    }

    try {
      const classCode = generateClassCode();

      const { data, error } = await supabase
        .from('organizes')
        .insert([{
          name: formData.name,
          description: formData.description,
          guru_id: profile?.id,
          code: classCode,
        }])
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Gagal membuat kelas');
        return;
      }

      // Update user's organize_id
      await supabase
        .from('users')
        .update({ organize_id: data.id })
        .eq('id', profile?.id);

      Alert.alert('Sukses', `Kelas berhasil dibuat dengan kode: ${classCode}`);
      setShowCreateForm(false);
      setFormData({ name: '', description: '' });
      fetchOrganize();
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat membuat kelas');
    }
  };

  const copyClassCode = () => {
    if (organize?.code) {
      Alert.alert('Kode Disalin', `Kode kelas: ${organize.code}\n\nBagikan kode ini kepada siswa untuk bergabung`);
    }
  };

  const viewStudentDetail = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setShowStudentDetail(true);
  };

  const confirmRemoveStudent = (student: StudentData) => {
    setStudentToRemove(student);
    setShowRemoveModal(true);
  };

  const removeStudent = async () => {
    if (!studentToRemove) return;

    try {
      // Remove student from organize
      const { error } = await supabase
        .from('users')
        .update({ organize_id: null })
        .eq('id', studentToRemove.id);

      if (error) {
        Alert.alert('Error', 'Gagal mengeluarkan siswa dari kelas');
        return;
      }

      Alert.alert('Sukses', `${studentToRemove.name} berhasil dikeluarkan dari kelas`);
      setShowRemoveModal(false);
      setStudentToRemove(null);
      fetchStudents(organize!.id);
      fetchOrganizeStats(organize!.id);
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat mengeluarkan siswa');
    }
  };

  useEffect(() => {
    fetchOrganize();
  }, [profile]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Memuat...</Text>
      </View>
    );
  }

  if (!organize) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Users size={32} color="#3B82F6" />
          <Text style={styles.headerTitle}>Kelola Kelas</Text>
          <Text style={styles.headerSubtitle}>Buat kelas untuk mengelola siswa</Text>
        </View>

        {showCreateForm ? (
          <View style={styles.createForm}>
            <Text style={styles.formTitle}>Buat Kelas Baru</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nama Kelas"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Deskripsi Kelas (opsional)"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.formActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setShowCreateForm(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable 
                style={styles.createButton}
                onPress={createOrganize}
              >
                <Text style={styles.createButtonText}>Buat Kelas</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.noOrganizeContainer}>
            <Users size={64} color="#9CA3AF" />
            <Text style={styles.noOrganizeTitle}>Belum Ada Kelas</Text>
            <Text style={styles.noOrganizeSubtitle}>
              Buat kelas pertama Anda untuk mulai mengelola siswa
            </Text>
            <Pressable 
              style={styles.createFirstButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Plus size={20} color="white" />
              <Text style={styles.createFirstButtonText}>Buat Kelas</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Users size={32} color="#3B82F6" />
          <Text style={styles.headerTitle}>Kelola Kelas</Text>
          <Text style={styles.headerSubtitle}>{organize.name}</Text>
        </View>

        {/* Class Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Users size={20} color="#3B82F6" />
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Siswa</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart3 size={20} color="#10B981" />
            <Text style={styles.statNumber}>{stats.totalSetoran}</Text>
            <Text style={styles.statLabel}>Total Setoran</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={20} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.pendingSetoran}</Text>
            <Text style={styles.statLabel}>Menunggu</Text>
          </View>
        </View>

        {/* Class Info */}
        <View style={styles.classInfoCard}>
          <View style={styles.classHeader}>
            <Text style={styles.className}>{organize.name}</Text>
            <Pressable style={styles.settingsButton}>
              <Settings size={20} color="#6B7280" />
            </Pressable>
          </View>
          
          {organize.description && (
            <Text style={styles.classDescription}>{organize.description}</Text>
          )}

          <View style={styles.classStats}>
            <View style={styles.statItem}>
              <Users size={16} color="#3B82F6" />
              <Text style={styles.statText}>{students.length} Siswa</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.statText}>
                Dibuat {new Date(organize.created_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <BarChart3 size={16} color="#10B981" />
              <Text style={styles.statText}>Akurasi Rata-rata: {stats.averageAccuracy}%</Text>
            </View>
          </View>

          <View style={styles.classCodeContainer}>
            <View style={styles.classCodeInfo}>
              <Text style={styles.classCodeLabel}>Kode Kelas</Text>
              <Text style={styles.classCode}>{organize.code}</Text>
            </View>
            <Pressable style={styles.copyButton} onPress={copyClassCode}>
              <Copy size={16} color="#10B981" />
            </Pressable>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daftar Siswa ({students.length})</Text>
            <Pressable style={styles.addStudentButton}>
              <UserPlus size={16} color="#3B82F6" />
            </Pressable>
          </View>

          {students.length === 0 ? (
            <View style={styles.emptyStudents}>
              <UserPlus size={48} color="#9CA3AF" />
              <Text style={styles.emptyStudentsText}>Belum ada siswa</Text>
              <Text style={styles.emptyStudentsSubtext}>
                Bagikan kode kelas untuk mengundang siswa
              </Text>
            </View>
          ) : (
            <View style={styles.studentsList}>
              {students.map((student) => (
                <View key={student.id}>
                  <View style={styles.studentCard}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentInitial}>
                        {student.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                      <Text style={styles.joinDate}>
                        Bergabung {new Date(student.created_at).toLocaleDateString('id-ID')}
                      </Text>
                    </View>

                    <View style={styles.studentActions}>
                      <Pressable 
                        style={styles.viewButton}
                        onPress={() => viewStudentDetail(student.id, student.name)}
                      >
                        <Eye size={16} color="#6B7280" />
                      </Pressable>
                      
                      <Pressable 
                        style={styles.removeButton}
                        onPress={() => confirmRemoveStudent(student)}
                      >
                        <UserMinus size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                  
                  {/* Attendance Tracker */}
                  <AttendanceTracker 
                    studentId={student.id}
                    studentName={student.name}
                    isTeacher={true}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <StudentDetailModal
        visible={showStudentDetail}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
        onClose={() => setShowStudentDetail(false)}
        isTeacher={true}
      />

      {/* Remove Student Modal */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Trash2 size={24} color="#EF4444" />
              <Text style={styles.modalTitle}>Keluarkan Siswa</Text>
              <Pressable onPress={() => setShowRemoveModal(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <Text style={styles.modalText}>
              Apakah Anda yakin ingin mengeluarkan {studentToRemove?.name} dari kelas?
            </Text>
            <Text style={styles.modalSubtext}>
              Siswa akan kehilangan akses ke kelas dan semua data setoran akan tetap tersimpan.
            </Text>

            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalCancelButton}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              
              <Pressable 
                style={styles.modalConfirmButton}
                onPress={removeStudent}
              >
                <Text style={styles.modalConfirmText}>Keluarkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  noOrganizeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  noOrganizeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  noOrganizeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createForm: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  classInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  settingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  classStats: {
    gap: 8,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  classCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  classCodeInfo: {
    flex: 1,
  },
  classCodeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  classCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addStudentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStudents: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStudentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStudentsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  studentsList: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  studentEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  joinDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: 'bold',
  },
});