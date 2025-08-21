import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Users, Key, CircleCheck as CheckCircle, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function JoinOrganizeScreen() {
  const { profile, refreshProfile } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);

  const joinOrganize = async () => {
    if (!classCode.trim()) {
      Alert.alert('Error', 'Mohon masukkan kode kelas');
      return;
    }

    if (profile?.organize_id) {
      Alert.alert('Info', 'Anda sudah bergabung dengan kelas');
      return;
    }

    setLoading(true);

    try {
      // Find organize by code
      const { data: organizeData, error: organizeError } = await supabase
        .from('organizes')
        .select('*')
        .eq('code', classCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (organizeError || !organizeData) {
        Alert.alert('Error', 'Kode kelas tidak ditemukan atau tidak aktif');
        setLoading(false);
        return;
      }

      // Update user's organize_id
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ organize_id: organizeData.id })
        .eq('id', profile?.id)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Error', 'Gagal bergabung dengan kelas');
        setLoading(false);
        return;
      }

      console.log('Update successful:', updateData);

      // Initialize siswa_poin if not exists
      const { data: existingPoints } = await supabase
        .from('siswa_poin')
        .select('*')
        .eq('siswa_id', profile?.id)
        .single();

      if (!existingPoints) {
        const { error: pointsError } = await supabase
          .from('siswa_poin')
          .insert([{
            siswa_id: profile?.id,
            total_poin: 0,
            poin_hafalan: 0,
            poin_quiz: 0,
          }]);

        if (pointsError) {
          console.error('Points creation error:', pointsError);
        }
      }

      Alert.alert(
        'Berhasil!', 
        `Anda berhasil bergabung dengan kelas "${organizeData.name}"`,
        [
          { 
            text: 'OK', 
            onPress: async () => {
              await refreshProfile();
              // Force a complete refresh by navigating to index first
              router.replace('/');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat bergabung dengan kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await refreshProfile();
    setLoading(false);
  };
  // If already in organize, show success state
  if (profile?.organize_id) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <CheckCircle size={64} color="#10B981" />
          <Text style={styles.successTitle}>Sudah Bergabung</Text>
          <Text style={styles.successSubtitle}>
            Anda sudah bergabung dengan kelas aktif
          </Text>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.backButtonText}>Kembali ke Beranda</Text>
          </Pressable>
          
          <Pressable 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Users size={32} color="#3B82F6" />
        <Text style={styles.headerTitle}>Gabung Kelas</Text>
        <Text style={styles.headerSubtitle}>Masukkan kode kelas untuk bergabung</Text>
      </View>

      {/* Join Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Key size={20} color="#3B82F6" />
          <TextInput
            style={styles.input}
            placeholder="Masukkan Kode Kelas"
            value={classCode}
            onChangeText={setClassCode}
            autoCapitalize="characters"
            maxLength={6}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Pressable
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={joinOrganize}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#9CA3AF', '#6B7280'] : ['#3B82F6', '#2563EB']}
            style={styles.joinButtonGradient}
          >
            {loading && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
            <Text style={styles.joinButtonText}>
              {loading ? 'Memproses...' : 'Gabung Kelas'}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Cara Bergabung:</Text>
          <Text style={styles.infoText}>
            1. Minta kode kelas dari guru Anda{'\n'}
            2. Masukkan kode 6 digit di atas{'\n'}
            3. Tekan tombol "Gabung Kelas"{'\n'}
            4. Mulai belajar dan kirim setoran!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
    padding: 32,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 8,
    fontWeight: '500',
  },
  formContainer: {
    padding: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 20,
    color: '#1F2937',
    fontWeight: 'bold',
    letterSpacing: 3,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  joinButtonGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
});