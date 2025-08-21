import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, Clock, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';

interface SetoranCardProps {
  setoran: {
    id: string;
    jenis: 'hafalan' | 'murojaah';
    surah: string;
    juz: number;
    tanggal: string;
    status: 'pending' | 'diterima' | 'ditolak';
    catatan?: string;
    poin: number;
  };
  onPress?: () => void;
}

export function SetoranCard({ setoran, onPress }: SetoranCardProps) {
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

  const StatusIcon = getStatusIcon(setoran.status);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeText}>
            {setoran.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(setoran.status) + '20' }]}>
          <StatusIcon size={12} color={getStatusColor(setoran.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(setoran.status) }]}>
            {setoran.status === 'pending' ? 'Menunggu' : 
             setoran.status === 'diterima' ? 'Diterima' : 'Ditolak'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.title}>{setoran.surah}</Text>
      <Text style={styles.details}>Juz {setoran.juz}</Text>
      
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#6B7280" />
          <Text style={styles.dateText}>
            {new Date(setoran.tanggal).toLocaleDateString('id-ID')}
          </Text>
        </View>
        {setoran.poin > 0 && (
          <Text style={styles.poinText}>+{setoran.poin} poin</Text>
        )}
      </View>

      {setoran.catatan && (
        <Text style={styles.catatan}>{setoran.catatan}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  poinText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  catatan: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    fontStyle: 'italic',
  },
});