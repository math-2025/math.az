# **App Name**: ExamHall

## Core Features:

- Exam Display: Displays exam questions with clear formatting. Supports multiple question types including multiple choice and free-form answers.
- Answer Submission: Allows students to submit answers for each question. Submissions are locally cached to prevent data loss, during the exam.
- Exam Timer: Displays a countdown timer, tracking time remaining in the exam. If exam finishes before time is up, there is the option to manually end it.
- Exam Result Summarization: After finishing the exam, generate the results with a LLM tool using a model local to the browser, and show student answer and a determination if correct or not.
- Cheating Detection Hints: Uses local model to detect if the user is attempting to use disallowed search terms while answering a question. Give hint to teachers in the result view, for them to use their own judgement.
- Exam Creation: Allows teachers to create exams with multiple questions and answer types via rich form.
- Student Group Management: Enables management of students into groups so teachers can specify which students will take the exam.

## Style Guidelines:

- Primary color: HSL(220, 70%, 40%) - RGB(30, 83, 176) A deep blue to inspire trust and focus.
- Background color: HSL(220, 20%, 95%) - RGB(242, 244, 247) A light, desaturated blue-gray for a clean and calming backdrop.
- Accent color: HSL(190, 80%, 50%) - RGB(25, 191, 191) A vibrant cyan as an accent to highlight important actions.
- Font pairing: 'Space Grotesk' for headlines, a modern sans-serif; and 'Inter' for body text, offering excellent readability. The code font is 'Source Code Pro'.
- Use simple, outline-style icons from a library like FontAwesome or Feather, with the accent color used for interactive elements.
- Employs a card-based layout for exams and questions, with a clean, grid-based structure to maximize readability and usability.
- Subtle animations for transitions and feedback, such as a progress bar during exam submission or a gentle fade-in for new questions.