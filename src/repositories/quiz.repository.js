const prisma = require("../config/prisma");

function buildPracticeScopedQuestionCreateInput({ practiceTestId, userId, question, sourceType, sourceGenerationId }) {
  return {
    question_type: question.questionType,
    question_text: question.questionText,
    question_explanation: question.questionExplanation ?? null,
    difficulty_level: question.difficultyLevel ?? "medium",
    points: question.points ?? 1,
    time_limit_seconds: question.timeLimitSeconds ?? null,
    creator_id: userId,
    lesson_id: null,
    course_id: null,
    visibility: "private",
    tags: {
      practiceTestId,
      questionSourceMode: sourceType,
      ...(sourceGenerationId ? { sourceGenerationId } : {}),
    },
    status: "active",
    created_by: userId,
    cnt_question_options: question.options?.length
      ? {
          create: question.options.map((opt, idx) => ({
            option_text: opt.optionText,
            option_order: opt.optionOrder ?? idx,
            is_correct: opt.isCorrect ?? false,
            option_explanation: opt.optionExplanation ?? null,
            created_by: userId,
          })),
        }
      : undefined,
  };
}

const quizRepository = {
  async findPracticeTestsByUser(userId, { where = {}, orderBy = { created_at_utc: "desc" }, skip = 0, take = 10 } = {}) {
    const baseWhere = {
      user_id: userId,
      ...where,
    };

    const [items, totalItems] = await prisma.$transaction([
      prisma.lrn_practice_tests.findMany({
        where: baseWhere,
        orderBy,
        skip,
        take,
      }),
      prisma.lrn_practice_tests.count({ where: baseWhere }),
    ]);

    return { items, totalItems };
  },

  async findPracticeTestByIdForUser(practiceTestId, _userId) {
    return prisma.lrn_practice_tests.findUnique({
      where: { practice_test_id: practiceTestId },
    });
  },

  async createPracticeTest(data) {
    return prisma.lrn_practice_tests.create({
      data: {
        user_id: data.userId,
        test_title: data.testTitle,
        test_description: data.testDescription ?? null,
        course_ids: data.courseIds ?? null,
        difficulty_levels: data.difficultyLevels ?? null,
        question_types: data.questionTypes ?? null,
        total_questions: data.totalQuestions,
        time_limit_minutes: data.timeLimitMinutes ?? null,
        randomize_questions: data.randomizeQuestions ?? true,
        randomize_options: data.randomizeOptions ?? true,
        show_correct_answers: data.showCorrectAnswers ?? true,
        attempts_count: data.attemptsCount ?? 0,
        best_score: data.bestScore ?? null,
        average_score: data.averageScore ?? null,
        last_attempt_at_utc: data.lastAttemptAtUtc ?? null,
        status: data.status ?? "active",
        created_by: data.createdBy,
      },
    });
  },

  async createPracticeTestWithScopedQuestions({ practice, scopedQuestions }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.lrn_practice_tests.create({
        data: {
          user_id: practice.userId,
          test_title: practice.testTitle,
          test_description: practice.testDescription ?? null,
          course_ids: practice.courseIds ?? null,
          difficulty_levels: practice.difficultyLevels ?? null,
          question_types: practice.questionTypes ?? null,
          total_questions: practice.totalQuestions,
          time_limit_minutes: practice.timeLimitMinutes ?? null,
          randomize_questions: practice.randomizeQuestions ?? true,
          randomize_options: practice.randomizeOptions ?? true,
          show_correct_answers: practice.showCorrectAnswers ?? true,
          attempts_count: practice.attemptsCount ?? 0,
          best_score: practice.bestScore ?? null,
          average_score: practice.averageScore ?? null,
          last_attempt_at_utc: practice.lastAttemptAtUtc ?? null,
          status: practice.status ?? "active",
          created_by: practice.createdBy,
        },
      });

      if (scopedQuestions?.questions?.length) {
        for (const question of scopedQuestions.questions) {
          await tx.cnt_questions.create({
            data: buildPracticeScopedQuestionCreateInput({
              practiceTestId: created.practice_test_id,
              userId: practice.userId,
              question,
              sourceType: scopedQuestions.sourceType ?? "manual",
              sourceGenerationId: scopedQuestions.sourceGenerationId ?? null,
            }),
          });
        }
      }

      return created;
    });
  },

  async createPracticeScopedQuestions({ practiceTestId, userId, questions, sourceType = "manual", sourceGenerationId = null }) {
    const operations = questions.map((q) =>
      prisma.cnt_questions.create({
        data: buildPracticeScopedQuestionCreateInput({
          practiceTestId,
          userId,
          question: q,
          sourceType,
          sourceGenerationId,
        }),
      })
    );

    return prisma.$transaction(operations);
  },

  async updatePracticeTest(practiceTestId, data) {
    return prisma.lrn_practice_tests.update({
      where: { practice_test_id: practiceTestId },
      data: {
        ...(data.testTitle !== undefined ? { test_title: data.testTitle } : {}),
        ...(data.testDescription !== undefined ? { test_description: data.testDescription } : {}),
        ...(data.courseIds !== undefined ? { course_ids: data.courseIds } : {}),
        ...(data.difficultyLevels !== undefined ? { difficulty_levels: data.difficultyLevels } : {}),
        ...(data.questionTypes !== undefined ? { question_types: data.questionTypes } : {}),
        ...(data.totalQuestions !== undefined ? { total_questions: data.totalQuestions } : {}),
        ...(data.timeLimitMinutes !== undefined ? { time_limit_minutes: data.timeLimitMinutes } : {}),
        ...(data.randomizeQuestions !== undefined ? { randomize_questions: data.randomizeQuestions } : {}),
        ...(data.randomizeOptions !== undefined ? { randomize_options: data.randomizeOptions } : {}),
        ...(data.showCorrectAnswers !== undefined ? { show_correct_answers: data.showCorrectAnswers } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.attemptsCount !== undefined ? { attempts_count: data.attemptsCount } : {}),
        ...(data.bestScore !== undefined ? { best_score: data.bestScore } : {}),
        ...(data.averageScore !== undefined ? { average_score: data.averageScore } : {}),
        ...(data.lastAttemptAtUtc !== undefined ? { last_attempt_at_utc: data.lastAttemptAtUtc } : {}),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async softDeletePracticeTest(practiceTestId, { userId }) {
    return prisma.lrn_practice_tests.update({
      where: { practice_test_id: practiceTestId },
      data: {
        status: "deleted",
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async findAttemptsByUser(userId, { where = {}, orderBy = { started_at_utc: "desc" }, skip = 0, take = 10 } = {}) {
    const baseWhere = {
      user_id: userId,
      ...where,
    };

    const [items, totalItems] = await prisma.$transaction([
      prisma.lrn_quiz_attempts.findMany({
        where: baseWhere,
        orderBy,
        skip,
        take,
      }),
      prisma.lrn_quiz_attempts.count({ where: baseWhere }),
    ]);

    return { items, totalItems };
  },

  async findAttemptByIdForUser(attemptId, userId) {
    return prisma.lrn_quiz_attempts.findFirst({
      where: { attempt_id: attemptId, user_id: userId },
    });
  },

  async createQuizAttempt(data) {
    return prisma.lrn_quiz_attempts.create({
      data: {
        user_id: data.userId,
        quiz_title: data.quizTitle ?? null,
        quiz_type: data.quizType ?? null,
        total_questions: data.totalQuestions,
        time_limit_seconds: data.timeLimitSeconds ?? null,
        passing_score: data.passingScore ?? null,
        questions_answered: 0,
        correct_answers: 0,
        score_achieved: null,
        percentage_score: null,
        is_passed: null,
        time_spent_seconds: null,
        status: "in_progress",
        created_by: data.createdBy,
      },
    });
  },

  async seedQuizAnswersForAttempt({ attemptId, userId, questionIds, createdBy }) {
    return prisma.lrn_quiz_answers.createMany({
      data: questionIds.map((qid) => ({
        attempt_id: attemptId,
        question_id: qid,
        user_id: userId,
        answer_text: null,
        selected_option_ids: null,
        is_correct: null,
        points_earned: null,
        points_possible: null,
        time_spent_seconds: null,
        answered_at_utc: null,
        created_by: createdBy,
        status: "pending",
      })),
      skipDuplicates: false,
    });
  },

  async findAttemptAnswersWithQuestions(attemptId) {
    return prisma.lrn_quiz_answers.findMany({
      where: { attempt_id: attemptId },
      include: {
        cnt_questions: {
          select: {
            question_id: true,
            question_type: true,
            question_text: true,
            question_explanation: true,
            difficulty_level: true,
            points: true,
            time_limit_seconds: true,
            status: true,
            cnt_question_options: {
              where: { status: { not: "deleted" } },
              orderBy: { option_order: "asc" },
              select: {
                option_id: true,
                option_text: true,
                option_order: true,
                is_correct: true,
                option_explanation: true,
              },
            },
          },
        },
      },
    });
  },

  async updateQuizAnswers(updates) {
    // updates: [{ whereAnswerId, data }]
    const operations = updates.map((u) =>
      prisma.lrn_quiz_answers.update({
        where: { answer_id: u.answerId },
        data: u.data,
      }),
    );
    return prisma.$transaction(operations);
  },

  async updateQuizAttempt(attemptId, data) {
    return prisma.lrn_quiz_attempts.update({
      where: { attempt_id: attemptId },
      data,
    });
  },

  async createTestSubmission(data) {
    return prisma.lrn_test_submissions.create({
      data: {
        practice_test_id: data.practiceTestId ?? null,
        user_id: data.userId,
        attempt_id: data.attemptId,
        submission_notes: data.submissionNotes ?? null,
        flagged_questions: data.flaggedQuestions ?? null,
        auto_graded_at_utc: null,
        manually_graded_at_utc: null,
        graded_by_user_id: null,
        grading_notes: null,
        created_by: data.createdBy,
        status: data.status ?? "submitted",
      },
    });
  },

  async findPracticeTestById(practiceTestId) {
    return prisma.lrn_practice_tests.findUnique({
      where: { practice_test_id: practiceTestId },
    });
  },

  async getQuestionsForScoring(questionIds) {
    const questions = await prisma.cnt_questions.findMany({
      where: { question_id: { in: questionIds } },
      select: {
        question_id: true,
        question_type: true,
        points: true,
      },
    });

    const correctOptions = await prisma.cnt_question_options.findMany({
      where: { question_id: { in: questionIds }, is_correct: true, status: { not: "deleted" } },
      select: { question_id: true, option_id: true, option_text: true, option_order: true },
    });

    return { questions, correctOptions };
  },

  async listCorrectOptionsByQuestionIds(questionIds) {
    return prisma.cnt_question_options.findMany({
      where: { question_id: { in: questionIds }, is_correct: true, status: { not: "deleted" } },
      select: {
        question_id: true,
        option_id: true,
        option_text: true,
        option_order: true,
        option_explanation: true,
      },
    });
  },

  async findPracticeScopedQuestions(practiceTestId) {
    return prisma.cnt_questions.findMany({
      where: {
        status: { not: "deleted" },
        tags: {
          path: ["practiceTestId"],
          equals: practiceTestId,
        },
      },
      orderBy: { created_at_utc: "desc" },
      include: {
        cnt_question_options: {
          where: { status: { not: "deleted" } },
          orderBy: { option_order: "asc" },
          select: {
            option_id: true,
            option_text: true,
            option_order: true,
            is_correct: true,
            option_explanation: true,
          },
        },
      },
    });
  },

  async selectCandidateQuestionsForPractice(practice) {
    // NOTE: we randomize in application code (shuffle + slice) to avoid SQL-specific random.
    const candidateLimit = Math.min(200, Math.max((practice.totalQuestions ?? 0) * 8, 40));
    const totalQuestions = practice.totalQuestions;

    const where = {
      status: "active",
      ...(Array.isArray(practice.courseIds) && practice.courseIds.length > 0
        ? { course_id: { in: practice.courseIds } }
        : {}),
      ...(Array.isArray(practice.difficultyLevels) && practice.difficultyLevels.length > 0
        ? { difficulty_level: { in: practice.difficultyLevels } }
        : {}),
      ...(Array.isArray(practice.questionTypes) && practice.questionTypes.length > 0
        ? { question_type: { in: practice.questionTypes } }
        : {}),
    };

    const questions = await prisma.cnt_questions.findMany({
      where,
      take: candidateLimit,
      orderBy: { created_at_utc: "desc" },
      include: {
        cnt_question_options: {
          where: { status: { not: "deleted" } },
          orderBy: { option_order: "asc" },
          select: {
            option_id: true,
            option_text: true,
            option_order: true,
            is_correct: true,
            option_explanation: true,
          },
        },
      },
    });

    return { questions, candidateLimit, totalQuestions };
  },
};

module.exports = quizRepository;

