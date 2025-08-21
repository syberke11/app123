import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Users, Key, CircleCheck as CheckCircle, RefreshCw } from 'lucide-react-native';

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
          {loading && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
          <Text style={styles.joinButtonText}>
            {loading ? 'Memproses...' : 'Gabung Kelas'}
          </Text>
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
  formContainer: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: 2,
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});