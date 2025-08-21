  /*
    # Create Quran Learning Platform Schema

    1. New Tables
      - `users` - Store user information with roles (admin, guru, siswa, ortu)
      - `organizes` - Classroom management created by teachers
      - `setoran` - Hafalan/Murojaah submissions with file uploads
      - `labels` - Achievement labels for completed juz
      - `quizzes` - Quiz questions and options
      - `quiz_answers` - Student quiz responses and scoring
      - `siswa_poin` - Student points accumulation

    2. Security
      - Enable RLS on all tables
      - Add policies for role-based access control
      - Users can only access data relevant to their role and organization

    3. Features
      - File upload integration with Cloudinary
      - Points system for achievements
      - Teacher assessment workflow
      - Parent monitoring capabilities
  */

  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'guru', 'siswa', 'ortu')) NOT NULL,
    type TEXT CHECK (type IN ('normal', 'cadel', 'school', 'personal')),
    organize_id UUID,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Organizes (Classroom) table
  CREATE TABLE IF NOT EXISTS organizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    guru_id UUID NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Add foreign key for organizes
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'users_organize_id_fkey'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_organize_id_fkey 
      FOREIGN KEY (organize_id) REFERENCES organizes(id);
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'organizes_guru_id_fkey'
    ) THEN
      ALTER TABLE organizes ADD CONSTRAINT organizes_guru_id_fkey 
      FOREIGN KEY (guru_id) REFERENCES users(id);
    END IF;
  END $$;

  -- Hafalan Setoran table
  CREATE TABLE IF NOT EXISTS setoran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES users(id),
    guru_id UUID REFERENCES users(id),
    organize_id UUID REFERENCES organizes(id),
    file_url TEXT NOT NULL,
    jenis TEXT CHECK (jenis IN ('hafalan', 'murojaah')) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('pending', 'diterima', 'ditolak')) DEFAULT 'pending',
    catatan TEXT,
    surah TEXT,
    juz INTEGER,
    ayat_mulai INTEGER,
    ayat_selesai INTEGER,
    poin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Label Juz Selesai table
  CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES users(id),
    juz INTEGER NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    diberikan_oleh UUID REFERENCES users(id),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Quiz table
  CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option TEXT NOT NULL,
    poin INTEGER DEFAULT 10,
    organize_id UUID REFERENCES organizes(id),
    difficulty TEXT CHECK (difficulty IN ('mudah', 'sedang', 'sulit')) DEFAULT 'mudah',
    category TEXT DEFAULT 'umum',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Jawaban Quiz table
  CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id),
    siswa_id UUID NOT NULL REFERENCES users(id),
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    poin INTEGER DEFAULT 0,
    answered_at TIMESTAMPTZ DEFAULT now()
  );

  -- Total Poin table
  CREATE TABLE IF NOT EXISTS siswa_poin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID UNIQUE NOT NULL REFERENCES users(id),
    total_poin INTEGER DEFAULT 0,
    poin_hafalan INTEGER DEFAULT 0,
    poin_quiz INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Bookmarks untuk Quran reading
  CREATE TABLE IF NOT EXISTS quran_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE organizes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
  ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE siswa_poin ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quran_bookmarks ENABLE ROW LEVEL SECURITY;

  -- RLS Policies

  -- Users policies
  CREATE POLICY "Users can read own data and same organize"
    ON users FOR SELECT
    TO authenticated
    USING (
      auth.uid() = id OR 
      organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
    );

  CREATE POLICY "Users can update own data"
    ON users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  -- Organizes policies
  CREATE POLICY "Users can read their organize"
    ON organizes FOR SELECT
    TO authenticated
    USING (
      id = (SELECT organize_id FROM users WHERE id = auth.uid()) OR
      guru_id = auth.uid()
    );

  CREATE POLICY "Guru can manage organizes"
    ON organizes FOR ALL
    TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'guru');

  -- Setoran policies
  CREATE POLICY "Setoran access by organize"
    ON setoran FOR SELECT
    TO authenticated
    USING (
      organize_id = (SELECT organize_id FROM users WHERE id = auth.uid()) OR
      siswa_id = auth.uid() OR
      guru_id = auth.uid()
    );

  CREATE POLICY "Siswa can insert setoran"
    ON setoran FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'siswa');

  CREATE POLICY "Guru can update setoran"
    ON setoran FOR UPDATE
    TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'guru');

  -- Labels policies
  CREATE POLICY "Labels access by organize"
    ON labels FOR SELECT
    TO authenticated
    USING (
      siswa_id = auth.uid() OR
      siswa_id IN (
        SELECT id FROM users 
        WHERE organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "Guru can manage labels"
    ON labels FOR ALL
    TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'guru');

  -- Quiz policies
  CREATE POLICY "Quiz access by organize"
    ON quizzes FOR SELECT
    TO authenticated
    USING (
      organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
    );

  CREATE POLICY "Guru can manage quizzes"
    ON quizzes FOR ALL
    TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'guru');

  -- Quiz answers policies
  CREATE POLICY "Quiz answers access"
    ON quiz_answers FOR SELECT
    TO authenticated
    USING (
      siswa_id = auth.uid() OR
      quiz_id IN (
        SELECT id FROM quizzes 
        WHERE organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "Siswa can insert quiz answers"
    ON quiz_answers FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'siswa');

  -- Siswa poin policies
  CREATE POLICY "Poin access by organize"
    ON siswa_poin FOR SELECT
    TO authenticated
    USING (
      siswa_id = auth.uid() OR
      siswa_id IN (
        SELECT id FROM users 
        WHERE organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "System can manage poin"
    ON siswa_poin FOR ALL
    TO authenticated
    USING (true);

  -- Quran bookmarks policies
  CREATE POLICY "Users can manage own bookmarks"
    ON quran_bookmarks FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_users_organize_id ON users(organize_id);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_setoran_siswa_id ON setoran(siswa_id);
  CREATE INDEX IF NOT EXISTS idx_setoran_organize_id ON setoran(organize_id);
  CREATE INDEX IF NOT EXISTS idx_setoran_status ON setoran(status);
  CREATE INDEX IF NOT EXISTS idx_labels_siswa_id ON labels(siswa_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_answers_siswa_id ON quiz_answers(siswa_id);
  CREATE INDEX IF NOT EXISTS idx_siswa_poin_siswa_id ON siswa_poin(siswa_id);