export const mockRoleAssessments = [
  {
    targetRole: "Frontend Developer",
    difficulty: "Intermediate",
    timeLimitMinutes: 20,
    questions: [
      {
        questionText: "Which hook should you choose to cache the computed result of an expensive calculation?",
        options: ["useEffect", "useMemo", "useCallback", "useRef"],
        correctAnswerIndex: 1,
        points: 10
      },
      {
        questionText: "What is the primary benefit of virtualized lists in UI layouts?",
        options: ["Better SEO indexing", "Saves database bandwidth", "Renders only elements inside visible viewports", "CSS styling animation control"],
        correctAnswerIndex: 2,
        points: 10
      }
    ]
  },
  {
    targetRole: "Backend Developer (Node.js)",
    difficulty: "Advanced",
    timeLimitMinutes: 25,
    questions: [
      {
        questionText: "Which statement accurately describes Node.js event-loop operations?",
        options: ["It runs on separate parallel CPUs", "It blocks asynchronous functions until I/O loops resolve", "It is single-threaded and utilizes non-blocking execution call stacks", "It requires multi-threading frameworks natively"],
        correctAnswerIndex: 2,
        points: 10
      }
    ]
  }
];