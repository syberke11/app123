/*
  # Add Attendance System

  1. New Tables
    - `attendance` - Daily attendance tracking for students
    
  2. Security
    - Enable RLS on attendance table
    - Add policies for teachers and students to manage attendance
    
  3. Features
    - Daily attendance tracking
    - Teacher can mark student attendance
    - Parents can view their children's attendance
*/

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('hadir', 'tidak_hadir', 'izin')) NOT NULL,
  noted_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Attendance read access"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    noted_by = auth.uid() OR
    student_id IN (
      SELECT id FROM users 
      WHERE organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin', 'ortu')
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('guru', 'admin')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);