const AppError = require("../utils/AppError");
const quizRepository = require("../repositories/quiz.repository");

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeText(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function arraysEqualAsSet(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const x of setA) {
    if (!setB.has(x)) return false;
  }
  return true;
}

function computeIsCorrect({ questionType, userSelectedOptionIds, userAnswerText, correctOptions }) {
  const correctOptionIds = correctOptions.map((o) => o.option_id);
  const correctOptionTexts = correctOptions.map((o) => o.option_text);

  if (questionType === "multiple_choice" || questionType === "true_false") {
    const selected = Array.isArray(userSelectedOptionIds) ? userSelectedOptionIds : [];
    return arraysEqualAsSet(selected, correctOptionIds);
  }

  // Text-based questions: short_answer / fill_in_blank / essay
  const userText = normalizeText(userAnswerText);
  if (!userText) return false;

  return correctOptionTexts.some((t) => normalizeText(t) === userText);
}

const quizService = {
  async getMyQuizPractices(userId, query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (query.search) {
      where.test_title = { contains: query.search, mode: "insensitive" };
    }
    if (query.status) {
      where.status = query.status;
    }

    const { items, totalItems } = await quizRepository.findPracticeTestsByUser(userId, {
      where,
      skip,
      take: limit,
      orderBy: { created_at_utc: "desc" },
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  async getMyQuizAttempts(userId, query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (query.status) where.status = query.status;
    if (query.practiceTestId) where.quiz_type = query.practiceTestId;

    const { items, totalItems } = await quizRepository.findAttemptsByUser(userId, {
      where,
      skip,
      take: limit,
      orderBy: { started_at_utc: "desc" },
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  async createQuizPractice(userId, body) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const created = await quizRepository.createPracticeTest({
      userId,
      testTitle: body.testTitle,
      testDescription: body.testDescription,
      courseIds: body.courseIds ?? null,
      difficultyLevels: body.difficultyLevels ?? null,
      questionTypes: body.questionTypes ?? null,
      totalQuestions: body.totalQuestions,
      timeLimitMinutes: body.timeLimitMinutes ?? null,
      randomizeQuestions: body.randomizeQuestions ?? true,
      randomizeOptions: body.randomizeOptions ?? true,
      showCorrectAnswers: body.showCorrectAnswers ?? true,
      status: "active",
      attemptsCount: 0,
      bestScore: null,
      averageScore: null,
      lastAttemptAtUtc: null,
      createdBy: userId,
    });

    return created;
  },

  async getQuizPracticeDetail(userId, practiceTestId) {
    const practice = await quizRepository.findPracticeTestByIdForUser(practiceTestId, userId);
    if (!practice || practice.status === "deleted") throw AppError.notFound("Quiz practice not found");
    if (practice.user_id !== userId) throw AppError.forbidden("You can only access your own quiz practices");
    return practice;
  },

  async updateQuizPractice(userId, practiceTestId, body) {
    const practice = await quizRepository.findPracticeTestByIdForUser(practiceTestId, userId);
    if (!practice || practice.status === "deleted") throw AppError.notFound("Quiz practice not found");
    if (practice.user_id !== userId) throw AppError.forbidden("You can only manage your own quiz practices");

    const updated = await quizRepository.updatePracticeTest(practiceTestId, {
      testTitle: body.testTitle,
      testDescription: body.testDescription,
      courseIds: body.courseIds,
      difficultyLevels: body.difficultyLevels,
      questionTypes: body.questionTypes,
      totalQuestions: body.totalQuestions,
      timeLimitMinutes: body.timeLimitMinutes,
      randomizeQuestions: body.randomizeQuestions,
      randomizeOptions: body.randomizeOptions,
      showCorrectAnswers: body.showCorrectAnswers,
      status: body.status,
      updatedBy: userId,
    });

    return updated;
  },

  async deleteQuizPractice(userId, practiceTestId) {
    const practice = await quizRepository.findPracticeTestByIdForUser(practiceTestId, userId);
    if (!practice || practice.status === "deleted") throw AppError.notFound("Quiz practice not found");
    if (practice.user_id !== userId) throw AppError.forbidden("You can only manage your own quiz practices");

    await quizRepository.softDeletePracticeTest(practiceTestId, { userId });
    return { deleted: true, practiceTestId };
  },

  async startQuizAttempt(userId, practiceTestId, { passingScore } = {}) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const practice = await quizRepository.findPracticeTestById(practiceTestId);
    if (!practice || practice.status === "deleted") throw AppError.notFound("Quiz practice not found");
    if (practice.user_id !== userId) throw AppError.forbidden("You can only start attempts for your own quiz practices");

    const { questions: candidateQuestions } = await quizRepository.selectCandidateQuestionsForPractice({
      totalQuestions: practice.total_questions,
      courseIds: practice.course_ids ?? null,
      difficultyLevels: practice.difficulty_levels ?? null,
      questionTypes: practice.question_types ?? null,
    });

    if (!Array.isArray(candidateQuestions) || candidateQuestions.length < practice.total_questions) {
      throw AppError.conflict("Not enough questions to generate this quiz practice");
    }

    const selectedQuestions = practice.randomize_questions
      ? shuffleArray(candidateQuestions).slice(0, practice.total_questions)
      : candidateQuestions.slice(0, practice.total_questions);

    // Shuffle options per-question if enabled (only order; correctness is based on option IDs)
    const questionsForResponse = selectedQuestions.map((q) => {
      const options = practice.randomize_options ? shuffleArray(q.cnt_question_options || []) : q.cnt_question_options || [];
      return { ...q, cnt_question_options: options };
    });

    const timeLimitSeconds = practice.time_limit_minutes ? Math.round(practice.time_limit_minutes * 60) : null;

    const attempt = await quizRepository.createQuizAttempt({
      userId,
      quizTitle: practice.test_title ?? null,
      quizType: practice.practice_test_id, // store practiceTestId for later retrieval
      totalQuestions: questionsForResponse.length,
      timeLimitSeconds,
      passingScore,
      createdBy: userId,
    });

    await quizRepository.seedQuizAnswersForAttempt({
      attemptId: attempt.attempt_id,
      userId,
      questionIds: questionsForResponse.map((q) => q.question_id),
      createdBy: userId,
    });

    // Note: answers are seeded as "pending"; we return question details for UI.
    return { attempt, questions: questionsForResponse };
  },

  async getQuizAttempt(userId, attemptId) {
    const attempt = await quizRepository.findAttemptByIdForUser(attemptId, userId);
    if (!attempt) throw AppError.notFound("Attempt not found");

    const answers = await quizRepository.findAttemptAnswersWithQuestions(attemptId);
    const answersByQuestionId = new Map(answers.map((a) => [a.question_id, a]));
    const questions = answers.map((a) => a.cnt_questions);

    // Hide correctness during handling
    return { attempt, questions, answersByQuestionId, showCorrectAnswers: false };
  },

  async submitQuizAttempt(userId, attemptId, body) {
    const attempt = await quizRepository.findAttemptByIdForUser(attemptId, userId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.status !== "in_progress") throw AppError.badRequest("Quiz attempt is not in progress");

    const practice = await quizRepository.findPracticeTestById(attempt.quiz_type);

    const answersRows = await quizRepository.findAttemptAnswersWithQuestions(attemptId);
    const answersByQuestionId = new Map(answersRows.map((a) => [a.question_id, a]));

    const payloadAnswers = Array.isArray(body.answers) ? body.answers : [];
    const payloadByQuestionId = new Map(payloadAnswers.map((a) => [a.questionId, a]));

    const seededQuestionIds = Array.from(answersByQuestionId.keys());

    // Require full coverage to avoid partially graded attempts.
    if (payloadByQuestionId.size !== seededQuestionIds.length) {
      throw AppError.badRequest("Answers must cover all quiz questions");
    }
    const payloadQuestionIds = Array.from(payloadByQuestionId.keys());
    const setsMatch = arraysEqualAsSet(payloadQuestionIds, seededQuestionIds);
    if (!setsMatch) {
      throw AppError.badRequest("Answers must cover the exact quiz questions set");
    }

    const { questions: questionMeta, correctOptions } = await quizRepository.getQuestionsForScoring(seededQuestionIds);
    const questionMetaById = new Map(questionMeta.map((q) => [q.question_id, q]));

    const correctOptionsByQuestionId = new Map();
    for (const opt of correctOptions) {
      const list = correctOptionsByQuestionId.get(opt.question_id) || [];
      list.push(opt);
      correctOptionsByQuestionId.set(opt.question_id, list);
    }

    const now = new Date();
    const timeSpentSeconds = attempt.started_at_utc ? Math.max(0, Math.floor((now - attempt.started_at_utc) / 1000)) : null;

    const totalPointsPossible = questionMeta.reduce((sum, q) => sum + Number(q.points ?? 1), 0);

    const updates = [];
    let correctAnswersCount = 0;
    let scoreAchieved = 0;

    for (const questionId of seededQuestionIds) {
      const questionInfo = questionMetaById.get(questionId);
      if (!questionInfo) continue;

      const payload = payloadByQuestionId.get(questionId);
      const answerText = payload?.answerText ?? null;
      const selectedOptionIds = payload?.selectedOptionIds ?? [];

      const correctOpts = correctOptionsByQuestionId.get(questionId) || [];
      const isCorrect = computeIsCorrect({
        questionType: questionInfo.question_type,
        userSelectedOptionIds: selectedOptionIds,
        userAnswerText: answerText,
        correctOptions: correctOpts,
      });

      const pointsPossible = Number(questionInfo.points ?? 1);
      const pointsEarned = isCorrect ? pointsPossible : 0;
      if (isCorrect) correctAnswersCount += 1;
      scoreAchieved += pointsEarned;

      const answerRow = answersByQuestionId.get(questionId);
      updates.push({
        answerId: answerRow.answer_id,
        data: {
          answer_text: answerText,
          selected_option_ids: Array.isArray(selectedOptionIds) && selectedOptionIds.length > 0 ? selectedOptionIds : null,
          is_correct: isCorrect,
          points_possible: pointsPossible,
          points_earned: pointsEarned,
          answered_at_utc: now,
          time_spent_seconds: timeSpentSeconds,
          status: "submitted",
          updated_at_utc: now,
        },
      });
    }

    await quizRepository.updateQuizAnswers(updates);

    const percentageScore = totalPointsPossible > 0 ? (scoreAchieved / totalPointsPossible) * 100 : 0;
    const passing = attempt.passing_score != null ? Number(attempt.passing_score) : null;
    const isPassed = passing != null ? percentageScore >= passing : null;

    let attemptStatus = "submitted";
    if (attempt.time_limit_seconds != null && timeSpentSeconds != null && timeSpentSeconds > attempt.time_limit_seconds) {
      attemptStatus = "expired";
    }

    await quizRepository.updateQuizAttempt(attemptId, {
      questions_answered: seededQuestionIds.length,
      correct_answers: correctAnswersCount,
      score_achieved: scoreAchieved,
      percentage_score: percentageScore,
      is_passed: isPassed,
      time_spent_seconds: timeSpentSeconds,
      status: attemptStatus,
      submitted_at_utc: now,
      updated_at_utc: now,
      updated_by: userId,
    });

    // Create a test submission record for future review/statistics.
    await quizRepository.createTestSubmission({
      practiceTestId: attempt.quiz_type,
      userId,
      attemptId,
      createdBy: userId,
      status: attemptStatus === "expired" ? "submitted" : "submitted",
    });

    // Update practice test stats (best score and average score).
    if (practice) {
      const currentAttemptsCount = Number(practice.attempts_count ?? 0);
      const newAttemptsCount = currentAttemptsCount + 1;
      // Lưu theo % (0–100) để hiển thị đúng, không phải điểm thô
      const bestScore = practice.best_score != null ? Math.max(Number(practice.best_score), percentageScore) : percentageScore;
      const currentAvg = practice.average_score != null ? Number(practice.average_score) : 0;
      const newAverage = (currentAvg * currentAttemptsCount + percentageScore) / newAttemptsCount;

      await quizRepository.updatePracticeTest(attempt.quiz_type, {
        attemptsCount: newAttemptsCount,
        bestScore,
        averageScore: newAverage,
        lastAttemptAtUtc: now,
        updatedBy: userId,
      });
    }

    const resultAttempt = await quizRepository.findAttemptByIdForUser(attemptId, userId);
    return { attempt: resultAttempt, totalPointsPossible };
  },

  async getQuizAttemptResult(userId, attemptId) {
    const attempt = await quizRepository.findAttemptByIdForUser(attemptId, userId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.status === "in_progress") throw AppError.badRequest("Quiz attempt is not submitted yet");

    const [practice, answers] = await Promise.all([
      quizRepository.findPracticeTestById(attempt.quiz_type),
      quizRepository.findAttemptAnswersWithQuestions(attemptId),
    ]);
    const totalPointsPossible = answers.reduce(
      (sum, a) => sum + Number(a.cnt_questions?.points ?? 1),
      0
    );

    const scoreAchieved = attempt.score_achieved != null ? Number(attempt.score_achieved) : null;
    const percentageScore = attempt.percentage_score != null ? Number(attempt.percentage_score) : null;

    const isPassed = attempt.is_passed != null ? Boolean(attempt.is_passed) : null;

    return { attempt, practice, totalPointsPossible, scoreAchieved, percentageScore, isPassed };
  },

  async reviewQuizAttempt(userId, attemptId) {
    const attempt = await quizRepository.findAttemptByIdForUser(attemptId, userId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.status === "in_progress") throw AppError.badRequest("Quiz attempt is not submitted yet");

    const practice = await quizRepository.findPracticeTestById(attempt.quiz_type);
    if (!practice) throw AppError.notFound("Quiz practice not found");

    const answersRows = await quizRepository.findAttemptAnswersWithQuestions(attemptId);
    const answersByQuestionId = new Map(answersRows.map((a) => [a.question_id, a]));
    const questions = answersRows.map((a) => a.cnt_questions);

    const questionIds = questions.map((q) => q.question_id);
    const correctOpts = await quizRepository.listCorrectOptionsByQuestionIds(questionIds);
    const correctOptionsByQuestionId = new Map();
    for (const o of correctOpts) {
      const list = correctOptionsByQuestionId.get(o.question_id) || [];
      list.push(o);
      correctOptionsByQuestionId.set(o.question_id, list);
    }

    return { attempt, practice, questions, answersByQuestionId, correctOptionsByQuestionId };
  },
};

module.exports = quizService;

