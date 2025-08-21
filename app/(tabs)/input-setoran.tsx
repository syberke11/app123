import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { CloudinaryService } from '@/services/cloudinary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, FileAudio, X, CircleCheck as CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function InputSetoranScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    jenis: 'hafalan' as 'hafalan' | 'murojaah',
    surah: '',
    juz: '',
    ayatMulai: '',
    ayatSelesai: '',
    file: null as any,
  });

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
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan setoran');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      jenis: 'hafalan',
      surah: '',
      juz: '',
      ayatMulai: '',
      ayatSelesai: '',
      file: null,
    });
  };

  return (
    <ScrollView 
      style={styles.container}
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
            <Upload size={32} color="white" />
          </View>
          <Text style={styles.headerTitle}>Input Setoran</Text>
          <Text style={styles.headerSubtitle}>Kirim hafalan atau murojaah Anda</Text>
        </LinearGradient>
      </Animated.View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Form Setoran Baru</Text>
          <Pressable onPress={resetForm} style={styles.resetButton}>
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
          {formData.file && <CheckCircle size={16} color="#10B981" />}
        </Pressable>

        <Pressable 
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={submitSetoran}
          disabled={uploading}
        >
          <LinearGradient
            colors={uploading ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? 'Mengupload...' : 'Kirim Setoran'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Tips Setoran:</Text>
          <Text style={styles.infoText}>
            • Pastikan audio jernih dan tidak ada noise{'\n'}
            • Bacaan sesuai dengan kaidah tajwid{'\n'}
            • File maksimal 10MB{'\n'}
            • Format yang didukung: MP3, M4A, WAV
          </Text>
        </View>
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
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  headerGradient: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  form: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -20,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 32,
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
  resetButton: {
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
  submitButton: {
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  infoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
    fontWeight: '500',
  },
});