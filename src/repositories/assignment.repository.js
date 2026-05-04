const prisma = require("../config/prisma");

const assignmentSelect = {
  assignment_id: true,
  course_id: true,
  chapter_id: true,
  lesson_id: true,
  title: true,
  description: true,
  instructions: true,
  submission_format: true,
  review_focus: true,
  max_score: true,
  rubric_criteria: true,
  source_type: true,
  created_at_utc: true,
  updated_at_utc: true,
  status: true,
};

const submissionSelect = {
  submission_id: true,
  assignment_id: true,
  course_id: true,
  chapter_id: true,
  lesson_id: true,
  user_id: true,
  answer_text: true,
  score: true,
  max_score: true,
  summary: true,
  strengths: true,
  improvements: true,
  rubric_scores: true,
  submitted_at_utc: true,
  graded_at_utc: true,
  status: true,
  lrn_lesson_assignments: {
    select: {
      title: true,
      max_score: true,
    },
  },
  mst_users: {
    select: {
      user_id: true,
      full_name: true,
      display_name: true,
      avatar_url: true,
      email: true,
    },
  },
  mst_courses: {
    select: {
      course_id: true,
      course_name: true,
      creator_id: true,
    },
  },
  mst_chapters: {
    select: {
      chapter_id: true,
      chapter_name: true,
    },
  },
  mst_lessons: {
    select: {
      lesson_id: true,
      lesson_name: true,
    },
  },
};

const assignmentRepository = {
  async findAssignmentByLesson(lessonId) {
    return prisma.lrn_lesson_assignments.findUnique({
      where: { lesson_id: lessonId },
      select: assignmentSelect,
    });
  },

  async upsertAssignment(data) {
    return prisma.lrn_lesson_assignments.upsert({
      where: { lesson_id: data.lessonId },
      create: {
        course_id: data.courseId,
        chapter_id: data.chapterId,
        lesson_id: data.lessonId,
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        submission_format: data.submissionFormat ?? null,
        review_focus: data.reviewFocus ?? null,
        max_score: data.maxScore,
        rubric_criteria: data.rubricCriteria,
        source_type: data.sourceType ?? "manual",
        created_by: data.userId,
        status: data.status ?? "active",
      },
      update: {
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        submission_format: data.submissionFormat ?? null,
        review_focus: data.reviewFocus ?? null,
        max_score: data.maxScore,
        rubric_criteria: data.rubricCriteria,
        source_type: data.sourceType ?? "manual",
        updated_by: data.userId,
        updated_at_utc: new Date(),
        status: data.status ?? "active",
      },
      select: assignmentSelect,
    });
  },

  async upsertSubmission(data) {
    return prisma.lrn_assignment_submissions.upsert({
      where: {
        assignment_id_user_id: {
          assignment_id: data.assignmentId,
          user_id: data.userId,
        },
      },
      create: {
        assignment_id: data.assignmentId,
        course_id: data.courseId,
        chapter_id: data.chapterId,
        lesson_id: data.lessonId,
        user_id: data.userId,
        answer_text: data.answerText,
        score: data.score,
        max_score: data.maxScore,
        summary: data.summary ?? null,
        strengths: data.strengths,
        improvements: data.improvements,
        rubric_scores: data.rubricScores,
        graded_at_utc: data.gradedAtUtc,
        created_by: data.userId,
        status: data.status ?? "graded",
      },
      update: {
        answer_text: data.answerText,
        score: data.score,
        max_score: data.maxScore,
        summary: data.summary ?? null,
        strengths: data.strengths,
        improvements: data.improvements,
        rubric_scores: data.rubricScores,
        submitted_at_utc: new Date(),
        graded_at_utc: data.gradedAtUtc,
        updated_by: data.userId,
        updated_at_utc: new Date(),
        status: data.status ?? "graded",
      },
      select: submissionSelect,
    });
  },

  async findSubmissionByLessonAndUser(lessonId, userId) {
    return prisma.lrn_assignment_submissions.findFirst({
      where: {
        lesson_id: lessonId,
        user_id: userId,
        status: { not: "deleted" },
      },
      orderBy: { submitted_at_utc: "desc" },
      select: submissionSelect,
    });
  },

  async findSubmissionById(submissionId) {
    return prisma.lrn_assignment_submissions.findUnique({
      where: { submission_id: submissionId },
      select: submissionSelect,
    });
  },

  async listExpertSubmissions({ userId, isAdmin, status, search, courseId, lessonId }) {
    const where = {
      status: status && status !== "all" ? status : { not: "deleted" },
      ...(courseId ? { course_id: courseId } : {}),
      ...(lessonId ? { lesson_id: lessonId } : {}),
      ...(!isAdmin ? { mst_courses: { creator_id: userId } } : {}),
    };

    if (search) {
      where.OR = [
        { answer_text: { contains: search, mode: "insensitive" } },
        { lrn_lesson_assignments: { title: { contains: search, mode: "insensitive" } } },
        { mst_courses: { course_name: { contains: search, mode: "insensitive" } } },
        { mst_lessons: { lesson_name: { contains: search, mode: "insensitive" } } },
        { mst_users: { full_name: { contains: search, mode: "insensitive" } } },
        { mst_users: { display_name: { contains: search, mode: "insensitive" } } },
        { mst_users: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    return prisma.lrn_assignment_submissions.findMany({
      where,
      orderBy: { submitted_at_utc: "desc" },
      take: 200,
      select: submissionSelect,
    });
  },
};

module.exports = assignmentRepository;
