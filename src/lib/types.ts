export type Student = {
  id: string;
  name: string;
  group: string;
  email?: string;
  pass?: string;
  cls?: string;
  parent?: string;
  status?: 'active' | 'disabled';
};

export type Question = {
  id: string;
  text: string;
  type: 'multiple-choice' | 'free-form';
  options?: string[];
  correctAnswer: string;
  fileUrl?: string; // Can be an image or a PDF data URL
  fileType?: string; // e.g., 'image/png' or 'application/pdf'
  fileName?: string;
};

export type Exam = {
  id: string;
  title: string;
  questions: Question[];
  assignedGroups: string[];
  startTime: string;
  endTime: string;
  pointsPerQuestion: number;
  announcement?: string;
};

export type Submission = {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  submittedAt: string;
  cheatingDetected?: boolean;
  score?: number; // Score is now stored directly in the submission
  manualScoreAdjustment?: number; // To track points added via appeal
};

export type Appeal = {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  questionId: string;
  questionText: string;
  reason: string;
  submittedAt: string;
  status: 'pending' | 'resolved' | 'rejected';
}
