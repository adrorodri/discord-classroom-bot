export interface QuizQuestion {
    id: string,
    content: string,
    maxTime: number,
    availableAnswers: string[] // EMOJIS
    correctAnswer: string // EMOJI
}