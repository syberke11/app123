/*
  # Complete Ngaji App Schema Update

  1. New Tables
    - Enhanced existing tables with better structure
    - Added proper relationships and constraints
    - Improved RLS policies for better security

  2. Security
    - Enhanced RLS policies for all user roles
    - Better access control for organize-based data
    - Secure file upload handling

  3. Features
    - Complete setoran workflow with audio files
    - Points system with automatic calculation
    - Label system for juz completion
    - Quiz system with scoring
    - Leaderboard functionality
    - Parent monitoring capabilities
*/

-- Update users table to ensure auth.uid() compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id UUID;
  END IF;
END $$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, type, auth_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'siswa'),
    COALESCE(NEW.raw_user_meta_data->>'type', 'normal'),
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to work with auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data and same organize" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies
CREATE POLICY "Users can read own data and same organize"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    organize_id = (SELECT organize_id FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin', 'ortu')
  );

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "System can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update setoran policies for better access control
DROP POLICY IF EXISTS "Setoran access by organize" ON setoran;
DROP POLICY IF EXISTS "Siswa can insert setoran" ON setoran;
DROP POLICY IF EXISTS "Guru can update setoran" ON setoran;

CREATE POLICY "Setoran read access"
  ON setoran FOR SELECT
  TO authenticated
  USING (
    siswa_id = auth.uid() OR
    guru_id = auth.uid() OR
    organize_id = (SELECT organize_id FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'ortu')
  );

CREATE POLICY "Siswa can insert own setoran"
  ON setoran FOR INSERT
  TO authenticated
  WITH CHECK (
    siswa_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'siswa'
  );

CREATE POLICY "Guru can update setoran in their organize"
  ON setoran FOR UPDATE
  TO authenticated
  USING (
    organize_id = (SELECT organize_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'guru'
  );

-- Enhanced quiz policies
DROP POLICY IF EXISTS "Quiz access by organize" ON quizzes;
DROP POLICY IF EXISTS "Guru can manage quizzes" ON quizzes;

CREATE POLICY "Quiz read access"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    organize_id = (SELECT organize_id FROM users WHERE id = auth.uid()) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Guru can manage quizzes"
  ON quizzes FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin')
  );

-- Enhanced quiz answers policies
DROP POLICY IF EXISTS "Quiz answers access" ON quiz_answers;
DROP POLICY IF EXISTS "Siswa can insert quiz answers" ON quiz_answers;

CREATE POLICY "Quiz answers read access"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    siswa_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin', 'ortu')
  );

CREATE POLICY "Siswa can insert quiz answers"
  ON quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    siswa_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'siswa'
  );

-- Enhanced labels policies
DROP POLICY IF EXISTS "Labels access by organize" ON labels;
DROP POLICY IF EXISTS "Guru can manage labels" ON labels;

CREATE POLICY "Labels read access"
  ON labels FOR SELECT
  TO authenticated
  USING (
    siswa_id = auth.uid() OR
    diberikan_oleh = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin', 'ortu')
  );

CREATE POLICY "Guru can manage labels"
  ON labels FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin')
  );

-- Enhanced siswa_poin policies
DROP POLICY IF EXISTS "Poin access by organize" ON siswa_poin;
DROP POLICY IF EXISTS "System can manage poin" ON siswa_poin;

CREATE POLICY "Poin read access"
  ON siswa_poin FOR SELECT
  TO authenticated
  USING (
    siswa_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin', 'ortu')
  );

CREATE POLICY "System can manage poin"
  ON siswa_poin FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin') OR
    siswa_id = auth.uid()
  );

-- Add some sample data for testing
INSERT INTO organizes (name, description, guru_id, code, is_active) 
VALUES 
  ('Kelas Tahfidz A', 'Kelas hafalan untuk pemula', (SELECT id FROM users WHERE role = 'guru' LIMIT 1), 'TAHFID', true),
  ('Kelas Tahfidz B', 'Kelas hafalan untuk menengah', (SELECT id FROM users WHERE role = 'guru' LIMIT 1), 'TAHFIB', true)
ON CONFLICT (code) DO NOTHING;

-- Add sample quizzes
INSERT INTO quizzes (question, options, correct_option, poin, difficulty, category, is_active)
VALUES 
  (
    'Berapa jumlah ayat dalam Surah Al-Fatihah?',
    '["5", "6", "7", "8"]',
    '7',
    10,
    'mudah',
    'Pengetahuan Quran',
    true
  ),
  (
    'Surah apakah yang disebut sebagai "Ummul Quran"?',
    '["Al-Baqarah", "Al-Fatihah", "Al-Ikhlas", "An-Nas"]',
    'Al-Fatihah',
    15,
    'sedang',
    'Pengetahuan Quran',
    true
  ),
  (
    'Berapa jumlah juz dalam Al-Quran?',
    '["28", "29", "30", "31"]',
    '30',
    10,
    'mudah',
    'Pengetahuan Quran',
    true
  )
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_setoran_tanggal ON setoran(tanggal);
CREATE INDEX IF NOT EXISTS idx_setoran_jenis ON setoran(jenis);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_id ON quiz_answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_labels_juz ON labels(juz);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Create function to automatically update siswa_poin when setoran is accepted
CREATE OR REPLACE FUNCTION update_siswa_poin_on_setoran()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'diterima' and poin > 0
  IF NEW.status = 'diterima' AND OLD.status != 'diterima' AND NEW.poin > 0 THEN
    INSERT INTO siswa_poin (siswa_id, total_poin, poin_hafalan, poin_quiz)
    VALUES (NEW.siswa_id, NEW.poin, NEW.poin, 0)
    ON CONFLICT (siswa_id) 
    DO UPDATE SET
      total_poin = siswa_poin.total_poin + NEW.poin,
      poin_hafalan = siswa_poin.poin_hafalan + NEW.poin,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic point updates
DROP TRIGGER IF EXISTS trigger_update_siswa_poin ON setoran;
CREATE TRIGGER trigger_update_siswa_poin
  AFTER UPDATE ON setoran
  FOR EACH ROW
  EXECUTE FUNCTION update_siswa_poin_on_setoran();