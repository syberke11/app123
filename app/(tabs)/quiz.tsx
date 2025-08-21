import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Clock, CircleCheck as CheckCircle, Target, Star, Brain } from 'lucide-react-native';

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_option: string;
  poin: number;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  category: string;
}

interface QuizAnswer {
  quiz_id: string;
  is_correct: boolean;
  poin: number;
  answered_at: string;
}

export default function QuizScreen() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [answeredQuizzes, setAnsweredQuizzes] = useState<QuizAnswer[]>([]);
  const [userStats, setUserStats] = useState({
    totalQuiz: 0,
    correctAnswers: 0,
    totalPoin: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    if (!profile?.organize_id) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('organize_id', profile.organize_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
        return;
      }

      setQuizzes(data || []);
    } catch (error) {
      console.error('Error in fetchQuizzes:', error);
    }
  };

  const fetchUserAnswers = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('siswa_id', profile.id);

      if (error) {
        console.error('Error fetching answers:', error);
        return;
      }

      setAnsweredQuizzes(data || []);

      // Calculate stats
      const totalQuiz = data?.length || 0;
      const correctAnswers = data?.filter(a => a.is_correct).length || 0;
      const totalPoin = data?.reduce((sum, a) => sum + a.poin, 0) || 0;

      setUserStats({ totalQuiz, correctAnswers, totalPoin });
    } catch (error) {
      console.error('Error in fetchUserAnswers:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setSelectedOption('');
  };

  const submitAnswer = async () => {
    if (!currentQuiz || !selectedOption || !profile) return;

    const isCorrect = selectedOption === currentQuiz.correct_option;
    const poin = isCorrect ? currentQuiz.poin : 0;

    try {
      // Save answer
      const { error: answerError } = await supabase
        .from('quiz_answers')
        .insert([{
          quiz_id: currentQuiz.id,
          siswa_id: profile.id,
          selected_option: selectedOption,
          is_correct: isCorrect,
          poin: poin,
        }]);

      if (answerError) {
        Alert.alert('Error', 'Gagal menyimpan jawaban');
        return;
      }

      // Update user points
      if (isCorrect) {
        const { data: currentPoints } = await supabase
          .from('siswa_poin')
          .select('*')
          .eq('siswa_id', profile.id)
          .single();

        if (currentPoints) {
          await supabase
            .from('siswa_poin')
            .update({
              total_poin: currentPoints.total_poin + poin,
              poin_quiz: currentPoints.poin_quiz + poin,
            })
            .eq('siswa_id', profile.id);
        }
      }

      Alert.alert(
        isCorrect ? 'Benar!' : 'Salah!',
        isCorrect 
          ? `Selamat! Anda mendapat ${poin} poin.`
          : `Jawaban yang benar adalah: ${currentQuiz.correct_option}`,
        [{ text: 'OK', onPress: () => {
          setCurrentQuiz(null);
          fetchUserAnswers();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan jawaban');
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchUserAnswers();
  }, [profile]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'mudah': return '#10B981';
      case 'sedang': return '#F59E0B';
      case 'sulit': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const isQuizAnswered = (quizId: string) => {
    return answeredQuizzes.some(answer => answer.quiz_id === quizId);
  };

  if (currentQuiz) {
    return (
      <View style={styles.quizContainer}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle}>Quiz</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(currentQuiz.difficulty) }]}>
            <Text style={styles.difficultyText}>{currentQuiz.difficulty}</Text>
          </View>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuiz.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuiz.options.map((option, index) => (
              <Pressable
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === option && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedOption(option)}
              >
                <Text style={[
                  styles.optionText,
                  selectedOption === option && styles.optionTextSelected
                ]}>
                  {String.fromCharCode(65 + index)}. {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.quizActions}>
            <Pressable 
              style={styles.backButton}
              onPress={() => setCurrentQuiz(null)}
            >
              <Text style={styles.backButtonText}>Kembali</Text>
            </Pressable>
            <Pressable 
              style={[styles.submitQuizButton, !selectedOption && styles.submitQuizButtonDisabled]}
              onPress={submitAnswer}
              disabled={!selectedOption}
            >
              <Text style={styles.submitQuizButtonText}>Kirim Jawaban</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Trophy size={32} color="#10B981" />
        <Text style={styles.headerTitle}>Quiz Interaktif</Text>
        <Text style={styles.headerSubtitle}>Asah kemampuan dengan quiz menarik</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Target size={20} color="#3B82F6" />
          <Text style={styles.statNumber}>{userStats.totalQuiz}</Text>
          <Text style={styles.statLabel}>Quiz Selesai</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.statNumber}>{userStats.correctAnswers}</Text>
          <Text style={styles.statLabel}>Benar</Text>
        </View>
        <View style={styles.statCard}>
          <Star size={20} color="#F59E0B" />
          <Text style={styles.statNumber}>{userStats.totalPoin}</Text>
          <Text style={styles.statLabel}>Poin Quiz</Text>
        </View>
      </View>

      {/* Quiz List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daftar Quiz</Text>
        
        {quizzes.length === 0 ? (
          <View style={styles.emptyState}>
            <Brain size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada quiz tersedia</Text>
            <Text style={styles.emptySubtext}>Quiz akan ditambahkan oleh guru</Text>
          </View>
        ) : (
          <View style={styles.quizList}>
            {quizzes.map((quiz) => {
              const answered = isQuizAnswered(quiz.id);
              return (
                <Pressable 
                  key={quiz.id} 
                  style={[styles.quizCard, answered && styles.quizCardAnswered]}
                  onPress={() => !answered && startQuiz(quiz)}
                  disabled={answered}
                >
                  <View style={styles.quizCardHeader}>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(quiz.difficulty) }]}>
                      <Text style={styles.difficultyText}>{quiz.difficulty}</Text>
                    </View>
                    <Text style={styles.quizPoin}>+{quiz.poin} poin</Text>
                  </View>
                  
                  <Text style={styles.quizQuestion} numberOfLines={2}>
                    {quiz.question}
                  </Text>
                  
                  <View style={styles.quizFooter}>
                    <Text style={styles.quizCategory}>{quiz.category}</Text>
                    {answered && (
                      <View style={styles.answeredBadge}>
                        <CheckCircle size={12} color="#10B981" />
                        <Text style={styles.answeredText}>Selesai</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
  quizList: {
    gap: 12,
  },
  quizCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quizCardAnswered: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quizPoin: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  quizQuestion: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 12,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  answeredText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  // Quiz View Styles
  quizContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    color: '#1F2937',
    lineHeight: 28,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  quizActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitQuizButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  submitQuizButtonDisabled: {
    opacity: 0.5,
  },
  submitQuizButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});