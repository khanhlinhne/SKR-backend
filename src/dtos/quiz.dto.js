function toPracticeItem(practice) {
  return {
    practiceTestId: practice.practice_test_id,
    testTitle: practice.test_title,
    testDescription: practice.test_description,
    courseIds: practice.course_ids,
    difficultyLevels: practice.difficulty_levels,
    questionTypes: practice.question_types,
    totalQuestions: practice.total_questions,
    timeLimitMinutes: practice.time_limit_minutes,
    randomizeQuestions: practice.randomize_questions,
    randomizeOptions: practice.randomize_options,
    showCorrectAnswers: practice.show_correct_answers,
    attemptsCount: practice.attempts_count ?? 0,
    bestScore: practice.best_score,
    averageScore: practice.average_score,
    lastAttemptAtUtc: practice.last_attempt_at_utc,
    status: practice.status,
  };
}

function toAttemptDetail(attempt, questions, answersByQuestionId, { showCorrectAnswers } = {}) {
  return {
    attemptId: attempt.attempt_id,
    quizTitle: attempt.quiz_title,
    practiceTestId: attempt.quiz_type,
    totalQuestions: attempt.total_questions,
    timeLimitSeconds: attempt.time_limit_seconds,
    passingScore: attempt.passing_score,
    questionsAnswered: attempt.questions_answered,
    correctAnswers: attempt.correct_answers,
    status: attempt.status,
    startedAtUtc: attempt.started_at_utc,
    submittedAtUtc: attempt.submitted_at_utc,
    questions: questions.map((q) => {
      const answer = answersByQuestionId.get(q.question_id);
      const selectedOptionIds = answer?.selected_option_ids ?? [];
      return {
        questionId: q.question_id,
        questionType: q.question_type,
        questionText: q.question_text,
        questionExplanation: q.question_explanation,
        difficultyLevel: q.difficulty_level,
        points: q.points ? Number(q.points) : 1,
        timeLimitSeconds: q.time_limit_seconds,
        options: (q.cnt_question_options || []).map((o) => ({
          optionId: o.option_id,
          optionText: o.option_text,
          optionOrder: o.option_order,
          ...(showCorrectAnswers && answer ? { isCorrect: o.is_correct } : {}),
        })),
        ...(showCorrectAnswers
          ? {
              userSelectedOptionIds: selectedOptionIds,
              userAnswerText: answer?.answer_text ?? null,
              isCorrect: answer?.is_correct ?? null,
            }
          : {
              userSelectedOptionIds: selectedOptionIds,
              userAnswerText: answer?.answer_text ?? null,
            }),
      };
    }),
  };
}

function toQuizResult(attempt, { totalPointsPossible, scoreAchieved, percentageScore, isPassed } = {}) {
  return {
    attemptId: attempt.attempt_id,
    practiceTestId: attempt.quiz_type,
    quizTitle: attempt.quiz_title,
    totalQuestions: attempt.total_questions,
    questionsAnswered: attempt.questions_answered,
    correctAnswers: attempt.correct_answers,
    scoreAchieved: scoreAchieved ?? attempt.score_achieved,
    percentageScore: percentageScore ?? attempt.percentage_score,
    passingScore: attempt.passing_score,
    isPassed: isPassed ?? attempt.is_passed,
    status: attempt.status,
    startedAtUtc: attempt.started_at_utc,
    submittedAtUtc: attempt.submitted_at_utc,
    timeSpentSeconds: attempt.time_spent_seconds,
    totalPointsPossible,
  };
}

function toQuizReview(attempt, practice, questions, answersByQuestionId, correctOptionsByQuestionId) {
  const showCorrect = Boolean(practice?.show_correct_answers);
  return {
    attemptId: attempt.attempt_id,
    practiceTestId: attempt.quiz_type,
    quizTitle: attempt.quiz_title,
    status: attempt.status,
    showCorrectAnswers: showCorrect,
    answers: questions.map((q) => {
      const ans = answersByQuestionId.get(q.question_id);
      const correctOpts = correctOptionsByQuestionId.get(q.question_id) || [];
      return {
        questionId: q.question_id,
        questionType: q.question_type,
        questionText: q.question_text,
        questionExplanation: q.question_explanation,
        userSelectedOptionIds: ans?.selected_option_ids ?? [],
        userAnswerText: ans?.answer_text ?? null,
        isCorrect: ans?.is_correct ?? null,
        pointsEarned: ans?.points_earned ?? null,
        pointsPossible: ans?.points_possible ?? null,
        ...(showCorrect
          ? {
              correctOptionIds: correctOpts.map((o) => o.option_id),
              correctOptionTexts: correctOpts.map((o) => o.option_text),
            }
          : {}),
      };
    }),
  };
}

function toAttemptListItem(attempt) {
  return {
    attemptId: attempt.attempt_id,
    practiceTestId: attempt.quiz_type,
    quizTitle: attempt.quiz_title,
    totalQuestions: attempt.total_questions,
    questionsAnswered: attempt.questions_answered,
    correctAnswers: attempt.correct_answers,
    scoreAchieved: attempt.score_achieved != null ? Number(attempt.score_achieved) : null,
    percentageScore: attempt.percentage_score != null ? Number(attempt.percentage_score) : null,
    isPassed: attempt.is_passed,
    status: attempt.status,
    startedAtUtc: attempt.started_at_utc,
    submittedAtUtc: attempt.submitted_at_utc,
  };
}

module.exports = {
  toPracticeItem,
  toAttemptDetail,
  toAttemptListItem,
  toQuizResult,
  toQuizReview,
};

