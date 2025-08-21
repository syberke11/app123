import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Alert, Modal, TextInput, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, CircleCheck as CheckCircle, CircleX, Clock, Users, User, ChartBar as BarChart3, MapPin, Download, ListFilter as Filter, X, FileText, Search, RefreshCw, Eye, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'hadir' | 'tidak_hadir' | 'izin';
  noted_by?: string;
  note?: string;
  created_at: string;
  student?: {
    name: string;
  };
}

interface AttendanceStats {
  totalDays: number;
  hadirCount: number;
  izinCount: number;
  tidakHadirCount: number;
  percentage: number;
}

interface StudentAttendance {
  id: string;
  name: string;
  attendanceRecords: AttendanceRecord[];
  stats: AttendanceStats;
  lastAttendance?: AttendanceRecord;
}

interface AttendanceDetail {
  date: string;
  students: {
    id: string;
    name: string;
    status: 'hadir' | 'tidak_hadir' | 'izin';
    note?: string;
  }[];
}

export default function AbsensiScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentAttendance[]>([]);
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    hadirCount: 0,
    izinCount: 0,
    tidakHadirCount: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'tidak_hadir' | 'izin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Real-time subscription
  useEffect(() => {
    if (!profile?.organize_id) return;

    const subscription = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          console.log('Attendance changed:', payload);
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.organize_id]);

  const fetchAttendanceData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'siswa') {
        await fetchStudentAttendance();
      } else if (profile.role === 'guru' || profile.role === 'ortu') {
        await fetchClassAttendance();
      }
    } catch (error) {
      console.error('Error in fetchAttendanceData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStudentAttendance = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', profile?.id)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching attendance:', error);
      return;
    }

    const records = data || [];
    setAttendanceRecords(records);
    calculateStats(records);
  };

  const fetchClassAttendance = async () => {
    if (!profile?.organize_id) return;

    // Get all students in the organize
    const { data: studentsData, error: studentsError } = await supabase
      .from('users')
      .select('id, name')
      .eq('organize_id', profile.organize_id)
      .eq('role', 'siswa')
      .order('name');

    if (studentsError || !studentsData) {
      console.error('Error fetching students:', studentsError);
      return;
    }

    // Get attendance records for all students
    const studentsWithAttendance = await Promise.all(
      studentsData.map(async (student) => {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false })
          .limit(30);

        const records = attendanceData || [];
        const stats = calculateStatsForStudent(records);
        const lastAttendance = records[0];

        return {
          id: student.id,
          name: student.name,
          attendanceRecords: records,
          stats,
          lastAttendance,
        };
      })
    );

    setStudentsAttendance(studentsWithAttendance);
    applyFilters(studentsWithAttendance);

    // Get daily attendance details for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const dailyDetails = await Promise.all(
      last7Days.map(async (date) => {
        const studentsForDate = await Promise.all(
          studentsData.map(async (student) => {
            const { data: attendanceData } = await supabase
              .from('attendance')
              .select('*')
              .eq('student_id', student.id)
              .eq('date', date)
              .single();

            return {
              id: student.id,
              name: student.name,
              status: attendanceData?.status || 'tidak_hadir',
              note: attendanceData?.note,
            };
          })
        );

        return {
          date,
          students: studentsForDate,
        };
      })
    );

    setAttendanceDetails(dailyDetails);
  };

  const applyFilters = (students: StudentAttendance[]) => {
    let filtered = students;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        if (filterStatus === 'tidak_hadir') {
          return student.stats.tidakHadirCount > 0;
        }
        return student.lastAttendance?.status === filterStatus;
      });
    }

    setFilteredStudents(filtered);
  };

  useEffect(() => {
    applyFilters(studentsAttendance);
  }, [searchQuery, filterStatus, studentsAttendance]);

  const calculateStats = (records: AttendanceRecord[]) => {
    const totalDays = records.length;
    const hadirCount = records.filter(r => r.status === 'hadir').length;
    const izinCount = records.filter(r => r.status === 'izin').length;
    const tidakHadirCount = records.filter(r => r.status === 'tidak_hadir').length;
    const percentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;

    setStats({
      totalDays,
      hadirCount,
      izinCount,
      tidakHadirCount,
      percentage,
    });
  };

  const calculateStatsForStudent = (records: AttendanceRecord[]): AttendanceStats => {
    const totalDays = records.length;
    const hadirCount = records.filter(r => r.status === 'hadir').length;
    const izinCount = records.filter(r => r.status === 'izin').length;
    const tidakHadirCount = records.filter(r => r.status === 'tidak_hadir').length;
    const percentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;

    return {
      totalDays,
      hadirCount,
      izinCount,
      tidakHadirCount,
      percentage,
    };
  };

  const exportToPDF = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Mohon pilih tanggal mulai dan selesai');
      return;
    }

    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          *,
          student:student_id(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        Alert.alert('Error', 'Gagal mengambil data absensi');
        return;
      }

      let csvContent = 'Tanggal,Nama Siswa,Status,Catatan\n';
      
      attendanceData?.forEach(record => {
        const statusText = record.status === 'hadir' ? 'Hadir' : 
                          record.status === 'izin' ? 'Izin' : 'Tidak Hadir';
        csvContent += `${record.date},${record.student?.name || 'Unknown'},${statusText},"${record.note || ''}"\n`;
      });

      const fileName = `absensi_${startDate}_${endDate}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sukses', `File disimpan di: ${fileUri}`);
      }

      setShowExportModal(false);
      setStartDate('');
      setEndDate('');
    } catch (error) {
      Alert.alert('Error', 'Gagal mengekspor data');
      console.error('Export error:', error);
    }
  };

  const viewStudentDetail = (student: StudentAttendance) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return '#10B981';
      case 'izin': return '#F59E0B';
      case 'tidak_hadir': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hadir': return CheckCircle;
      case 'izin': return Clock;
      case 'tidak_hadir': return CircleX;
      default: return Calendar;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'hadir': return 'Hadir';
      case 'izin': return 'Izin';
      case 'tidak_hadir': return 'Tidak Hadir';
      default: return status;
    }
  };

  // Student View
  if (profile?.role === 'siswa') {
    return (
      <View style={styles.container}>
        {/* Enhanced Header Card */}
        <Animated.View 
          entering={FadeInUp.delay(100)}
          style={[styles.headerCard, { paddingTop: insets.top + 20 }]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerIconContainer}>
              <Calendar size={32} color="white" />
            </View>
            <Text style={styles.headerTitle}>Absensi Saya</Text>
            <Text style={styles.headerSubtitle}>Pantau kehadiran dan konsistensi belajar</Text>
            
            {/* Quick Stats in Header */}
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{stats.percentage}%</Text>
                <Text style={styles.headerStatLabel}>Kehadiran</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{stats.totalDays}</Text>
                <Text style={styles.headerStatLabel}>Total Hari</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView 
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Stats Cards */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.statsContainer}>
            <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
              <LinearGradient
                colors={['#DCFCE7', '#F0FDF4']}
                style={styles.statGradient}
              >
                <CheckCircle size={24} color="#10B981" />
                <Text style={styles.statNumber}>{stats.hadirCount}</Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </LinearGradient>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
              <LinearGradient
                colors={['#FEF3C7', '#FFFBEB']}
                style={styles.statGradient}
              >
                <Clock size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.izinCount}</Text>
                <Text style={styles.statLabel}>Izin</Text>
              </LinearGradient>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
              <LinearGradient
                colors={['#FEE2E2', '#FEF2F2']}
                style={styles.statGradient}
              >
                <CircleX size={24} color="#EF4444" />
                <Text style={styles.statNumber}>{stats.tidakHadirCount}</Text>
                <Text style={styles.statLabel}>Alpha</Text>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Attendance History */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Riwayat Kehadiran</Text>
              <Pressable onPress={onRefresh} style={styles.refreshButton}>
                <RefreshCw size={16} color="#8B5CF6" />
              </Pressable>
            </View>
            
            {attendanceRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Belum ada data absensi</Text>
                <Text style={styles.emptySubtext}>Data kehadiran akan muncul setelah guru mencatat absensi</Text>
              </View>
            ) : (
              <View style={styles.attendanceList}>
                {attendanceRecords.map((record, index) => {
                  const StatusIcon = getStatusIcon(record.status);
                  return (
                    <Animated.View 
                      key={record.id} 
                      entering={FadeInDown.delay(index * 50)}
                      style={styles.attendanceCard}
                    >
                      <LinearGradient
                        colors={['#FFFFFF', '#FAFBFC']}
                        style={styles.attendanceGradient}
                      >
                        <View style={styles.attendanceLeft}>
                          <View style={styles.attendanceDate}>
                            <Calendar size={16} color="#64748B" />
                            <View>
                              <Text style={styles.attendanceDateText}>
                                {new Date(record.date).toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long'
                                })}
                              </Text>
                              <Text style={styles.attendanceYear}>
                                {new Date(record.date).getFullYear()}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.attendanceRight}>
                          <View style={[
                            styles.statusBadge, 
                            { backgroundColor: getStatusColor(record.status) + '15' }
                          ]}>
                            <StatusIcon size={16} color={getStatusColor(record.status)} />
                            <Text style={[
                              styles.statusText, 
                              { color: getStatusColor(record.status) }
                            ]}>
                              {getStatusText(record.status)}
                            </Text>
                          </View>
                          {record.note && (
                            <Text style={styles.noteText} numberOfLines={1}>
                              {record.note}
                            </Text>
                          )}
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Teacher/Parent View
  return (
    <View style={styles.container}>
      {/* Enhanced Header Card */}
      <Animated.View 
        entering={FadeInUp.delay(100)}
        style={[styles.headerCard, { paddingTop: insets.top + 20 }]}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB', '#1D4ED8']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerIconContainer}>
            <Users size={32} color="white" />
          </View>
          <Text style={styles.headerTitle}>Rekap Absensi</Text>
          <Text style={styles.headerSubtitle}>
            {profile?.role === 'guru' ? 'Kelola kehadiran siswa' : 'Pantau kehadiran anak'}
          </Text>
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <Pressable 
              style={styles.headerActionButton}
              onPress={() => setShowExportModal(true)}
            >
              <Download size={16} color="white" />
              <Text style={styles.headerActionText}>Export</Text>
            </Pressable>
            <Pressable 
              style={styles.headerActionButton}
              onPress={onRefresh}
            >
              <RefreshCw size={16} color="white" />
              <Text style={styles.headerActionText}>Refresh</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search and Filter */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { key: 'all', label: 'Semua', icon: Users },
              { key: 'hadir', label: 'Hadir', icon: CheckCircle },
              { key: 'izin', label: 'Izin', icon: Clock },
              { key: 'tidak_hadir', label: 'Alpha', icon: CircleX },
            ].map((filter) => {
              const IconComponent = filter.icon;
              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    filterStatus === filter.key && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterStatus(filter.key as any)}
                >
                  <IconComponent 
                    size={16} 
                    color={filterStatus === filter.key ? 'white' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.filterButtonText,
                    filterStatus === filter.key && styles.filterButtonTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Students List */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Daftar Siswa ({filteredStudents.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              {searchQuery ? 'Hasil pencarian' : 'Klik untuk detail kehadiran'}
            </Text>
          </View>
          
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada data siswa'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Coba kata kunci lain' : 'Pastikan siswa sudah terdaftar di kelas'}
              </Text>
            </View>
          ) : (
            <View style={styles.studentsList}>
              {filteredStudents.map((student, index) => (
                <Animated.View 
                  key={student.id} 
                  entering={FadeInDown.delay(index * 100)}
                >
                  <Pressable 
                    style={styles.studentCard}
                    onPress={() => viewStudentDetail(student)}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      style={styles.studentGradient}
                    >
                      <View style={styles.studentHeader}>
                        <View style={styles.studentInfo}>
                          <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={styles.studentAvatar}
                          >
                            <Text style={styles.studentInitial}>
                              {student.name.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                          <View style={styles.studentDetails}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <Text style={styles.studentStats}>
                              {student.stats.percentage}% kehadiran • {student.stats.totalDays} hari tercatat
                            </Text>
                            {student.lastAttendance && (
                              <Text style={styles.lastAttendance}>
                                Terakhir: {new Date(student.lastAttendance.date).toLocaleDateString('id-ID')} - {getStatusText(student.lastAttendance.status)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.studentActions}>
                          <View style={[
                            styles.statusIndicator,
                            { backgroundColor: getStatusColor(student.lastAttendance?.status || 'tidak_hadir') }
                          ]} />
                          <ChevronRight size={20} color="#9CA3AF" />
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <LinearGradient
                            colors={student.stats.percentage >= 80 ? ['#10B981', '#059669'] : 
                                    student.stats.percentage >= 60 ? ['#F59E0B', '#D97706'] : ['#EF4444', '#DC2626']}
                            style={[styles.progressFill, { width: `${student.stats.percentage}%` }]}
                          />
                        </View>
                        <Text style={styles.progressText}>{student.stats.percentage}%</Text>
                      </View>

                      {/* Quick Stats */}
                      <View style={styles.quickStats}>
                        <View style={styles.quickStatItem}>
                          <CheckCircle size={14} color="#10B981" />
                          <Text style={styles.quickStatNumber}>{student.stats.hadirCount}</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                          <Clock size={14} color="#F59E0B" />
                          <Text style={styles.quickStatNumber}>{student.stats.izinCount}</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                          <CircleX size={14} color="#EF4444" />
                          <Text style={styles.quickStatNumber}>{student.stats.tidakHadirCount}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Student Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Detail Kehadiran - {selectedStudent?.name}
            </Text>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.modalCloseButton}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          {selectedStudent && (
            <ScrollView style={styles.modalContent}>
              {/* Student Stats */}
              <View style={styles.modalStatsContainer}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.modalStatsGradient}
                >
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatNumber}>{selectedStudent.stats.percentage}%</Text>
                    <Text style={styles.modalStatLabel}>Persentase Hadir</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatNumber}>{selectedStudent.stats.totalDays}</Text>
                    <Text style={styles.modalStatLabel}>Total Hari</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Detailed Attendance List */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Riwayat Lengkap</Text>
                {selectedStudent.attendanceRecords.map((record, index) => {
                  const StatusIcon = getStatusIcon(record.status);
                  return (
                    <View key={record.id} style={styles.detailAttendanceCard}>
                      <View style={styles.detailAttendanceLeft}>
                        <Text style={styles.detailAttendanceDate}>
                          {new Date(record.date).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Text>
                        {record.note && (
                          <Text style={styles.detailAttendanceNote}>{record.note}</Text>
                        )}
                      </View>
                      <View style={[
                        styles.detailStatusBadge,
                        { backgroundColor: getStatusColor(record.status) + '20' }
                      ]}>
                        <StatusIcon size={14} color={getStatusColor(record.status)} />
                        <Text style={[
                          styles.detailStatusText,
                          { color: getStatusColor(record.status) }
                        ]}>
                          {getStatusText(record.status)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={styles.exportModalContent}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.exportModalGradient}
            >
              <View style={styles.exportModalHeader}>
                <FileText size={24} color="#3B82F6" />
                <Text style={styles.exportModalTitle}>Export Data Absensi</Text>
                <Pressable onPress={() => setShowExportModal(false)}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>
              
              <Text style={styles.exportModalText}>
                Pilih rentang tanggal untuk mengekspor data absensi dalam format CSV
              </Text>

              <View style={styles.dateInputs}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Tanggal Mulai</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Tanggal Selesai</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.exportModalActions}>
                <Pressable 
                  style={styles.exportModalCancelButton}
                  onPress={() => setShowExportModal(false)}
                >
                  <Text style={styles.exportModalCancelText}>Batal</Text>
                </Pressable>
                
                <Pressable 
                  style={styles.exportModalConfirmButton}
                  onPress={exportToPDF}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.exportModalConfirmGradient}
                  >
                    <Download size={16} color="white" />
                    <Text style={styles.exportModalConfirmText}>Export CSV</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  headerCard: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
  },
  headerGradient: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerIconContainer: {
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
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 20,
    gap: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerStatLabel: {
    fontSize: 13,
    color: 'white',
    opacity: 0.9,
    marginTop: 6,
    fontWeight: '600',
  },
  headerStatDivider: {
    width: 2,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerActionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    marginTop: -20,
  },
  searchFilterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#1F2937',
    fontWeight: '500',
  },
  filterScroll: {
    marginHorizontal: -4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingVertical: 20,
    gap: Math.max(12, width * 0.03),
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderLeftWidth: 4,
  },
  statGradient: {
    padding: Math.max(20, width * 0.05),
    alignItems: 'center',
    gap: 12,
  },
  statNumber: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: Math.min(12, width * 0.03),
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: Math.max(20, width * 0.05),
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Math.min(22, width * 0.055),
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: Math.min(14, width * 0.035),
    color: '#64748B',
    fontWeight: '500',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: Math.max(40, width * 0.1),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyText: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: Math.min(14, width * 0.035),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  attendanceList: {
    gap: 12,
  },
  attendanceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  attendanceGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  attendanceLeft: {
    flex: 1,
  },
  attendanceDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceDateText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  attendanceYear: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  attendanceRight: {
    alignItems: 'flex-end',
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
    fontSize: 12,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  studentsList: {
    gap: 16,
  },
  studentCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  studentGradient: {
    padding: 20,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  studentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  studentInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  studentStats: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  lastAttendance: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    minWidth: 35,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalStatsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalStatsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  modalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  modalStatLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  modalStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  detailSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  detailAttendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailAttendanceLeft: {
    flex: 1,
  },
  detailAttendanceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailAttendanceNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  exportModalGradient: {
    padding: 24,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  exportModalText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  dateInputs: {
    gap: 16,
    marginBottom: 24,
  },
  dateInputContainer: {
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dateInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1F2937',
  },
  exportModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportModalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  exportModalCancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
  exportModalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  exportModalConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  exportModalConfirmText: {
    color: 'white',
    fontWeight: 'bold',
  },
});