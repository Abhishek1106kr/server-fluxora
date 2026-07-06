export const mockRoleAssessments = [
  {
    roleTarget: "Frontend Developer",
    timeLimitMinutes: 20,
    questions: [
      {
        questionId: "fe_q1",
        questionText: "Which hook should you choose to cache the computed result of an expensive calculation?",
        options: ["useEffect", "useMemo", "useCallback", "useRef"],
        correctOptionIndex: 1
      },
      {
        questionId: "fe_q2",
        questionText: "What is the primary benefit of virtualized lists in UI layouts?",
        options: ["Better SEO indexing", "Saves database bandwidth", "Renders only elements inside visible viewports", "CSS styling animation control"],
        correctOptionIndex: 2
      }
    ]
  },
  {
    roleTarget: "Backend Developer (Node.js)",
    timeLimitMinutes: 25,
    questions: [
      {
        questionId: "be_q1",
        questionText: "Which statement accurately describes Node.js event-loop operations?",
        options: ["It runs on separate parallel CPUs", "It blocks asynchronous functions until I/O loops resolve", "It is single-threaded and utilizes non-blocking execution call stacks", "It requires multi-threading frameworks natively"],
        correctOptionIndex: 2
      }
    ]
  }
];