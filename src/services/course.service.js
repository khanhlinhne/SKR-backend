const path = require("path");
const AppError = require("../utils/AppError");
const courseRepository = require("../repositories/course.repository");
const courseProgressRepository = require("../repositories/course-progress.repository");
const assignmentRepository = require("../repositories/assignment.repository");
const userRepository = require("../repositories/user.repository");
const courseDto = require("../dtos/course.dto");
const aiGeminiService = require("./ai-gemini.service");

const ALLOWED_SORT_FIELDS = {
  createdAt: "created_at_utc",
  publishedAt: "published_at_utc",
  courseName: "course_name",
  displayOrder: "display_order",
  priceAmount: "price_amount",
  purchaseCount: "purchase_count",
  ratingAverage: "rating_average",
};

const VALID_CONTENT_VISIBILITY = new Set([
  "public",
  "private",
  "premium_only",
  "unlisted",
]);

const LESSON_TYPE_ALIASES = {
  assigment: "assignment",
  test: "quiz",
  tests: "quiz",
  "practice-test": "quiz",
  practice_test: "quiz",
};

const VALID_LESSON_TYPES = new Set([
  "video",
  "document",
  "quiz",
  "flashcard",
  "assignment",
]);

function normalizeOptionalText(value) {
  if (typeof value !== "string") return value ?? undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeOptionalInteger(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOptionalBigInt(value) {
  if (value === undefined || value === null || value === "") return undefined;

  try {
    return BigInt(value);
  } catch (_error) {
    return undefined;
  }
}

function normalizeLessonType(value) {
  if (value === undefined || value === null || value === "") return undefined;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;

  const resolved = LESSON_TYPE_ALIASES[normalized] || normalized;
  return VALID_LESSON_TYPES.has(resolved) ? resolved : undefined;
}

function getFileNameFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return undefined;

  const sanitizedUrl = fileUrl.split("#")[0].split("?")[0];
  const fileName = sanitizedUrl.split("/").pop();

  if (!fileName) return undefined;

  try {
    return decodeURIComponent(fileName);
  } catch (_error) {
    return fileName;
  }
}

function getFileTypeFromName(fileName) {
  const extension = path.extname(fileName || "").slice(1).toLowerCase();
  return extension || undefined;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeBoundedText(value, maxLength, fallback = "") {
  const normalized = normalizeText(value, fallback);
  if (!maxLength || normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function normalizeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRubricCriteria(criteria, maxScore = 100) {
  const items = normalizeJsonArray(criteria);
  const fallback = [
    {
      criterionId: "criterion-1",
      title: "Muc do dap ung yeu cau",
      description: "Tra loi dung trong tam va giai quyet yeu cau cua de bai.",
      maxPoints: 40,
    },
    {
      criterionId: "criterion-2",
      title: "Lap luan va giai thich",
      description: "Dien giai ro rang, co logic va co vi du phu hop.",
      maxPoints: 35,
    },
    {
      criterionId: "criterion-3",
      title: "Trinh bay",
      description: "Cau truc gon gang, de doc va de danh gia.",
      maxPoints: 25,
    },
  ];

  return (items.length ? items : fallback)
    .map((item, index) => ({
      criterionId: normalizeText(item?.criterionId || item?.id, `criterion-${index + 1}`),
      title: normalizeText(item?.title || item?.criterionTitle, `Tieu chi ${index + 1}`),
      description: normalizeText(item?.description || item?.criterionDescription),
      maxPoints: Math.max(0, toSafeNumber(item?.maxPoints ?? item?.score ?? item?.weight, 0)),
    }))
    .filter((item) => item.title);
}

function mapAssignment(row, context = {}) {
  if (!row) return null;

  const maxScore = Math.max(1, toSafeNumber(row.max_score, context.maxScore ?? 100));

  return {
    assignmentId: row.assignment_id || context.assignmentId || row.lesson_id,
    courseId: row.course_id || context.courseId || null,
    chapterId: row.chapter_id || context.chapterId || null,
    lessonId: row.lesson_id || context.lessonId || null,
    title: row.title || context.title || "",
    description: row.description || "",
    instructions: row.instructions || "",
    submissionFormat: row.submission_format || "Tra loi bang van ban.",
    reviewFocus: row.review_focus || "",
    maxScore,
    rubricCriteria: normalizeRubricCriteria(row.rubric_criteria, maxScore),
    sourceType: row.source_type || "manual",
    updatedAtUtc: row.updated_at_utc || row.created_at_utc || null,
    status: row.status || "active",
    available: row.status !== "deleted",
  };
}

function mapFallbackAssignment(lessonDetail, context = {}) {
  return {
    assignmentId: lessonDetail.lessonId,
    courseId: context.courseId || null,
    chapterId: context.chapterId || null,
    lessonId: lessonDetail.lessonId,
    title: lessonDetail.lessonName,
    description: lessonDetail.lessonDescription || "",
    instructions: lessonDetail.learningObjectives || "",
    submissionFormat: "Tra loi bang van ban.",
    reviewFocus: "",
    maxScore: 100,
    rubricCriteria: normalizeRubricCriteria([], 100),
    sourceType: "lesson",
    status: "active",
    available: lessonDetail.hasAssignment,
    documents: lessonDetail.documents,
    questions: lessonDetail.questions,
    flashcardSets: lessonDetail.flashcardSets,
  };
}

function mapAssignmentSubmission(row) {
  if (!row) return null;

  const learner = row.mst_users || {};
  const assignment = row.lrn_lesson_assignments || {};
  const course = row.mst_courses || {};
  const chapter = row.mst_chapters || {};
  const lesson = row.mst_lessons || {};
  const maxScore = Math.max(1, toSafeNumber(row.max_score ?? assignment.max_score, 100));

  return {
    submissionId: row.submission_id,
    assignmentId: row.assignment_id,
    courseId: row.course_id,
    chapterId: row.chapter_id,
    lessonId: row.lesson_id,
    courseTitle: course.course_name || "",
    chapterTitle: chapter.chapter_name || "",
    lessonTitle: lesson.lesson_name || "",
    assignmentTitle: assignment.title || "",
    learnerId: row.user_id,
    learnerName: learner.display_name || learner.full_name || learner.email || "Hoc vien",
    learnerAvatarUrl: learner.avatar_url || "",
    answerText: row.answer_text || "",
    submittedAtUtc: row.submitted_at_utc,
    gradedAtUtc: row.graded_at_utc,
    status: row.status || "graded",
    score: toSafeNumber(row.score, 0),
    maxScore,
    summary: row.summary || "",
    strengths: normalizeJsonArray(row.strengths),
    improvements: normalizeJsonArray(row.improvements),
    rubricScores: normalizeJsonArray(row.rubric_scores),
  };
}

function gradeAssignmentSubmissionFallback(assignment, answerText) {
  const text = normalizeText(answerText);
  const maxScore = Math.max(1, toSafeNumber(assignment?.maxScore, 100));
  const criteria = normalizeRubricCriteria(assignment?.rubricCriteria, maxScore);

  if (!text) {
    return {
      score: 0,
      summary: "Bai nop khong co noi dung de cham diem.",
      strengths: [],
      improvements: ["Can nop cau tra loi day du theo de bai."],
      rubricScores: criteria.map((criterion) => ({
        criterionId: criterion.criterionId,
        criterionTitle: criterion.title,
        awardedPoints: 0,
        maxPoints: criterion.maxPoints,
        feedback: "Chua co noi dung de danh gia.",
      })),
    };
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const coverageRatio = Math.max(0.25, Math.min(1, wordCount / 180));
  const clarityBoost = /(\n|- |\d+\.)/.test(text) ? 0.08 : 0;
  const scoreRatio = Math.min(0.94, coverageRatio + clarityBoost);
  const rubricScores = criteria.map((criterion) => ({
    criterionId: criterion.criterionId,
    criterionTitle: criterion.title,
    awardedPoints: Math.round(toSafeNumber(criterion.maxPoints, 0) * scoreRatio),
    maxPoints: toSafeNumber(criterion.maxPoints, 0),
    feedback: scoreRatio >= 0.75
      ? "Bai lam dap ung kha tot tieu chi nay."
      : "Can bo sung them ly giai, vi du hoac cau truc de dat diem cao hon.",
  }));
  const score = Math.min(
    maxScore,
    rubricScores.reduce((sum, item) => sum + item.awardedPoints, 0) || Math.round(maxScore * scoreRatio)
  );

  return {
    score,
    summary: "Bai nop da duoc luu va cham theo rubric assignment.",
    strengths: scoreRatio >= 0.7 ? ["Bai lam co cau truc va bao phu duoc yeu cau chinh."] : [],
    improvements: ["Nen bo sung ly giai cu the hon de tang do thuyet phuc."],
    rubricScores,
  };
}

async function gradeAssignmentSubmissionWithAi(assignment, answerText) {
  try {
    const grade = await aiGeminiService.gradeAssignmentSubmission({
      assignment,
      answerText,
      language: "vi",
    });

    return {
      score: grade.score,
      summary: grade.summary || "Gemini da cham bai theo rubric assignment.",
      strengths: grade.strengths,
      improvements: grade.improvements,
      rubricScores: grade.rubricScores,
      aiModel: grade.aiModel,
      aiProvider: grade.aiProvider,
    };
  } catch (error) {
    const message = error?.message || "unknown error";
    console.warn(`[Assignment][Gemini] Falling back to local grading: ${message}`);

    const fallback = gradeAssignmentSubmissionFallback(assignment, answerText);
    return {
      ...fallback,
      summary: `${fallback.summary} Fallback local vi Gemini loi: ${message}`,
      aiModel: null,
      aiProvider: "local_fallback",
    };
  }
}

function buildProgressResponse({ courseId, purchase, totalLessons, totalChapters, progressRows }) {
  const completedRows = (progressRows || []).filter((row) => row.completed);
  const completedLessonIds = completedRows.map((row) => row.lesson_id);
  const lessonProgressById = Object.fromEntries(
    (progressRows || []).map((row) => [
      row.lesson_id,
      {
        lessonId: row.lesson_id,
        chapterId: row.chapter_id,
        completed: Boolean(row.completed),
        completedAt: row.completed_at_utc,
        updatedAt: row.updated_at_utc || row.created_at_utc,
      },
    ])
  );

  return {
    courseId,
    isEnrolled: Boolean(purchase),
    status: purchase?.status ?? "not_started",
    progressPercent: toSafeNumber(purchase?.progress_percent),
    completedLessons: toSafeNumber(purchase?.lessons_completed),
    totalLessons,
    completedChapters: toSafeNumber(purchase?.chapters_completed),
    totalChapters,
    completedLessonIds,
    progress: Object.values(lessonProgressById),
    lessonProgressById,
    lastAccessedAt: purchase?.last_accessed_at_utc ?? null,
    completedAt: purchase?.completed_at_utc ?? null,
  };
}

function getActiveCourseStructureFromCourse(course) {
  return (course?.mst_chapters || [])
    .filter((chapter) => chapter.is_active !== false)
    .map((chapter) => ({
      chapter_id: chapter.chapter_id,
      mst_lessons: (chapter.mst_lessons || [])
        .filter((lesson) => lesson.is_active !== false)
        .map((lesson) => ({ lesson_id: lesson.lesson_id })),
    }));
}

async function saveCourseLessonProgressSnapshot({
  purchase,
  courseId,
  userId,
  structure,
  chapterId,
  lessonId,
  completed = true,
}) {
  const currentRows = await courseProgressRepository.findLessonProgressRows(purchase.purchase_id);
  const activeLessonIds = new Set(
    structure.flatMap((chapter) => (chapter.mst_lessons || []).map((lesson) => lesson.lesson_id))
  );
  const completedSet = new Set(
    currentRows
      .filter((row) => row.completed && activeLessonIds.has(row.lesson_id))
      .map((row) => row.lesson_id)
  );

  if (completed) {
    completedSet.add(lessonId);
  } else {
    completedSet.delete(lessonId);
  }

  const totalLessons = activeLessonIds.size;
  const completedLessons = completedSet.size;
  const chaptersCompleted = structure.filter((chapter) => {
    const lessonIds = (chapter.mst_lessons || []).map((lesson) => lesson.lesson_id);
    return lessonIds.length > 0 && lessonIds.every((id) => completedSet.has(id));
  }).length;
  const progressPercent = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 10000) / 100
    : 0;
  const updatedAt = new Date();
  const completedAtUtc = progressPercent >= 100 && totalLessons > 0
    ? purchase.completed_at_utc || updatedAt
    : null;

  await courseProgressRepository.saveLessonProgressAndPurchaseSnapshot({
    purchaseId: purchase.purchase_id,
    courseId,
    userId,
    chapterId,
    lessonId,
    completed,
    completedLessons,
    chaptersCompleted,
    progressPercent,
    totalLessons,
    completedAtUtc,
    updatedAt,
  });
}

function ensureActiveLessonInCourse(course, chapterId, lessonId) {
  const chapter = (course?.mst_chapters || []).find((item) => item.chapter_id === chapterId);
  if (!chapter || chapter.is_active === false) {
    throw AppError.notFound("Chapter not found in this course");
  }

  const lesson = (chapter.mst_lessons || []).find((item) => item.lesson_id === lessonId);
  if (!lesson || lesson.is_active === false) {
    throw AppError.notFound("Lesson not found in this chapter");
  }

  return lesson;
}

const courseService = {
  // ──────────────── COURSES ────────────────

  async getCourses(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = { is_active: true };

    if (query.search) {
      where.OR = [
        { course_name: { contains: query.search, mode: "insensitive" } },
        { course_code: { contains: query.search, mode: "insensitive" } },
        { course_description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.admin) {
      // Admin: cho phép lọc theo status nếu muốn, không thì lấy tất cả
      if (query.status) {
        where.status = query.status;
      }
    } else {
      // Người dùng công khai: chỉ thấy khóa học đã xuất bản
      where.status = "published";
    }

    if (query.isFree !== undefined && query.isFree !== "") {
      where.is_free = query.isFree === "true";
    }

    if (query.isFeatured !== undefined && query.isFeatured !== "") {
      where.is_featured = query.isFeatured === "true";
    }

    if (query.creatorId) {
      where.creator_id = query.creatorId;
    }

    const sortField = ALLOWED_SORT_FIELDS[query.sortBy] || "created_at_utc";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [sortField]: sortOrder };

    const { items, totalItems } = await courseRepository.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(courseDto.toListItem),
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

  async getCourseDetail(courseId) {
    const course = await courseRepository.findByIdWithStructure(courseId);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    return courseDto.toDetail(course);
  },

  async getCourseProgress(courseId, userId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to view course progress.");
    }

    const [course, purchase, structure] = await Promise.all([
      courseRepository.findByIdWithStructure(courseId),
      courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId),
      courseProgressRepository.findActiveCourseStructure(courseId),
    ]);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const totalChapters = structure.length || toSafeNumber(course.total_chapters ?? course.mst_chapters?.length);
    const totalLessons = structure.reduce((sum, chapter) => sum + (chapter.mst_lessons || []).length, 0)
      || toSafeNumber(course.total_lessons);
    const progressRows = purchase?.purchase_id
      ? await courseProgressRepository.findLessonProgressRows(purchase.purchase_id)
      : [];

    return buildProgressResponse({
      courseId,
      purchase,
      totalLessons,
      totalChapters,
      progressRows,
    });
  },

  async updateCourseProgress(courseId, userId, body = {}) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update course progress.");
    }

    const lessonId = normalizeText(body.lessonId || body.lesson_id);
    const requestedChapterId = normalizeText(body.chapterId || body.chapter_id);
    const completed = body.completed !== false;

    if (!lessonId) {
      throw AppError.badRequest("lessonId is required.");
    }

    const [course, purchase, lessonContext, structure] = await Promise.all([
      courseRepository.findByIdWithStructure(courseId),
      courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId),
      courseProgressRepository.findLessonContext(lessonId),
      courseProgressRepository.findActiveCourseStructure(courseId),
    ]);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (!purchase) {
      throw AppError.forbidden("You need to enroll in this course before saving progress.");
    }

    if (
      !lessonContext
      || !lessonContext.is_active
      || !lessonContext.mst_chapters?.is_active
      || lessonContext.mst_chapters.course_id !== courseId
    ) {
      throw AppError.notFound("Lesson not found in this course.");
    }

    const chapterId = requestedChapterId || lessonContext.chapter_id;
    if (chapterId !== lessonContext.chapter_id) {
      throw AppError.badRequest("chapterId does not match lessonId.");
    }

    const currentRows = await courseProgressRepository.findLessonProgressRows(purchase.purchase_id);
    const activeLessonIds = new Set(
      structure.flatMap((chapter) => (chapter.mst_lessons || []).map((lesson) => lesson.lesson_id))
    );
    const completedSet = new Set(
      currentRows
        .filter((row) => row.completed && activeLessonIds.has(row.lesson_id))
        .map((row) => row.lesson_id)
    );

    if (completed) {
      completedSet.add(lessonId);
    } else {
      completedSet.delete(lessonId);
    }

    const totalLessons = activeLessonIds.size;
    const completedLessons = completedSet.size;
    const chaptersCompleted = structure.filter((chapter) => {
      const lessonIds = (chapter.mst_lessons || []).map((lesson) => lesson.lesson_id);
      return lessonIds.length > 0 && lessonIds.every((id) => completedSet.has(id));
    }).length;
    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 10000) / 100
      : 0;
    const updatedAt = new Date();
    const completedAtUtc = progressPercent >= 100 && totalLessons > 0
      ? purchase.completed_at_utc || updatedAt
      : null;

    await courseProgressRepository.saveLessonProgressAndPurchaseSnapshot({
      purchaseId: purchase.purchase_id,
      courseId,
      userId,
      chapterId,
      lessonId,
      completed,
      completedLessons,
      chaptersCompleted,
      progressPercent,
      totalLessons,
      completedAtUtc,
      updatedAt,
    });

    const [updatedPurchase, progressRows] = await Promise.all([
      courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId),
      courseProgressRepository.findLessonProgressRows(purchase.purchase_id),
    ]);

    return buildProgressResponse({
      courseId,
      purchase: updatedPurchase,
      totalLessons,
      totalChapters: structure.length,
      progressRows,
    });
  },

  async createCourse(userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a course.");
    }

    // Auto-generate courseCode if not provided
    let courseCode = body.courseCode;
    if (!courseCode) {
      // Generate from course name: remove diacritics, replace spaces with hyphens, add random suffix
      const baseName = (body.courseName || "COURSE")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^A-Za-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toUpperCase()
        .substring(0, 30);
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      courseCode = `${baseName}-${suffix}`;
    }

    const existing = await courseRepository.findByCode(courseCode);
    if (existing) {
      throw AppError.conflict(`Course code "${courseCode}" already exists`);
    }

    const course = await courseRepository.create({
      courseCode,
      courseName: body.courseName,
      courseDescription: body.courseDescription,
      category: body.category,
      courseIconUrl: body.courseIconUrl,
      courseBannerUrl: body.courseBannerUrl,
      coursePreviewVideoUrl: body.coursePreviewVideoUrl,
      displayOrder: body.displayOrder,
      creatorId: userId,
      isFree: body.isFree,
      priceAmount: body.priceAmount,
      originalPrice: body.originalPrice,
      currencyCode: body.currencyCode,
      discountPercent: body.discountPercent,
      discountValidUntil: body.discountValidUntil,
      estimatedDurationHours: body.estimatedDurationHours,
      isFeatured: body.isFeatured,
      status: body.status,
      createdBy: userId,
    });

    const full = await courseRepository.findByIdWithStructure(course.course_id);
    return courseDto.toDetail(full);
  },

  async updateCourse(courseId, userId, roles, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update a course.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const isAdmin = roles && roles.includes("admin");
    if (!isAdmin && course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit your own courses");
    }

    if (body.courseCode && body.courseCode !== course.course_code) {
      const existing = await courseRepository.findByCode(body.courseCode);
      if (existing) {
        throw AppError.conflict(`Course code "${body.courseCode}" already exists`);
      }
    }

    await courseRepository.update(courseId, {
      ...body,
      updatedBy: userId,
    });

    const updated = await courseRepository.findByIdWithStructure(courseId);
    return courseDto.toDetail(updated);
  },

  async deleteCourse(courseId, userId, roles) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to delete a course.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const isAdmin = roles && roles.includes("admin");
    if (!isAdmin && course.creator_id !== userId) {
      throw AppError.forbidden("You can only delete your own courses");
    }

    await courseRepository.softDelete(courseId, userId);
    return { deleted: true, courseId };
  },

  // ──────────────── CHAPTERS ────────────────

  async getChapters(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const chapters = await courseRepository.findChaptersWithLessonsForList(courseId);
    return chapters.map(courseDto.toChapterItem);
  },

  async createChapter(courseId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a chapter.");
    }

    const [course, existing, maxChapterOrder] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterByCode(courseId, body.chapterCode),
      courseRepository.getMaxChapterOrder(courseId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only add chapters to your own courses");
    }

    if (existing) {
      throw AppError.conflict(`Chapter code "${body.chapterCode}" already exists in this course`);
    }

    const displayOrder = body.displayOrder ?? maxChapterOrder + 1;

    const chapter = await courseRepository.createChapter({
      courseId,
      chapterCode: body.chapterCode,
      chapterName: body.chapterName,
      chapterDescription: body.chapterDescription,
      chapterNumber: body.chapterNumber,
      displayOrder,
      estimatedDurationMinutes: body.estimatedDurationMinutes,
      createdBy: userId,
    });

    await courseRepository.updateStats(courseId);

    const full = await courseRepository.findChapterById(chapter.chapter_id);
    return courseDto.toChapterItem(full);
  },

  async updateChapter(courseId, chapterId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update a chapter.");
    }

    const [course, chapter] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit chapters in your own courses");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (body.chapterCode && body.chapterCode !== chapter.chapter_code) {
      const existing = await courseRepository.findChapterByCode(courseId, body.chapterCode);
      if (existing) {
        throw AppError.conflict(`Chapter code "${body.chapterCode}" already exists in this course`);
      }
    }

    await courseRepository.updateChapter(chapterId, {
      ...body,
      updatedBy: userId,
    });

    const updated = await courseRepository.findChapterById(chapterId);
    return courseDto.toChapterItem(updated);
  },

  async deleteChapter(courseId, chapterId, userId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to delete a chapter.");
    }

    const [course, chapter] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only delete chapters from your own courses");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    await courseRepository.softDeleteChapter(chapterId, userId);
    await courseRepository.updateStats(courseId);

    return { deleted: true, chapterId };
  },

  // ──────────────── LESSONS ────────────────

  async getLessons(courseId, chapterId) {
    const [course, chapter] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterByIdWithLessons(chapterId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    return (chapter.mst_lessons || []).filter((l) => l.is_active !== false).map(courseDto.toLessonItem);
  },

  async createLesson(courseId, chapterId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a lesson.");
    }

    const [course, chapter, existing, maxLessonOrder] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonByCode(chapterId, body.lessonCode),
      courseRepository.getMaxLessonOrder(chapterId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only add lessons to your own courses");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (existing) {
      throw AppError.conflict(`Lesson code "${body.lessonCode}" already exists in this chapter`);
    }

    const displayOrder = body.displayOrder ?? maxLessonOrder + 1;

    const lesson = await courseRepository.createLesson({
      chapterId,
      lessonCode: body.lessonCode,
      lessonName: body.lessonName,
      lessonDescription: body.lessonDescription,
      lessonNumber: body.lessonNumber,
      displayOrder,
      learningObjectives: body.learningObjectives,
      estimatedDurationMinutes: body.estimatedDurationMinutes,
      lessonType: normalizeLessonType(body.lessonType ?? body.lesson_type ?? body.type),
      createdBy: userId,
    });

    await courseRepository.updateStats(courseId);

    return courseDto.toLessonItem(lesson);
  },

  async updateLesson(courseId, chapterId, lessonId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update a lesson.");
    }

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit lessons in your own courses");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    if (body.lessonCode && body.lessonCode !== lesson.lesson_code) {
      const existing = await courseRepository.findLessonByCode(chapterId, body.lessonCode);
      if (existing) {
        throw AppError.conflict(`Lesson code "${body.lessonCode}" already exists in this chapter`);
      }
    }

    await courseRepository.updateLesson(lessonId, {
      ...body,
      lessonType: normalizeLessonType(body.lessonType ?? body.lesson_type ?? body.type),
      updatedBy: userId,
    });

    const updated = await courseRepository.findLessonById(lessonId);
    return courseDto.toLessonItem(updated);
  },

  async deleteLesson(courseId, chapterId, lessonId, userId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to delete a lesson.");
    }

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only delete lessons from your own courses");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    await courseRepository.softDeleteLesson(lessonId, userId);
    await courseRepository.updateStats(courseId);

    return { deleted: true, lessonId };
  },

  // ──────────────── LESSON CONTENT ────────────────

  async getLessonContent(courseId, chapterId, lessonId) {
    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonByIdWithContent(lessonId),
    ]);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    return courseDto.toLessonDetail(lesson);
  },

  async getLessonAssignment(courseId, chapterId, lessonId) {
    const course = await courseRepository.findByIdWithStructure(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    ensureActiveLessonInCourse(course, chapterId, lessonId);

    const lesson = await courseRepository.findLessonByIdWithContent(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    const [lessonDetail, assignmentRow] = await Promise.all([
      Promise.resolve(courseDto.toLessonDetail(lesson)),
      assignmentRepository.findAssignmentByLesson(lessonId),
    ]);

    return mapAssignment(assignmentRow, { courseId, chapterId, lessonId })
      || mapFallbackAssignment(lessonDetail, { courseId, chapterId });
  },

  async upsertLessonAssignment(courseId, chapterId, lessonId, userId, roles = [], body = {}) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to save assignment.");
    }

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const isAdmin = Array.isArray(roles) && roles.includes("admin");
    if (!isAdmin && course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit assignments in your own courses.");
    }

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    const title = normalizeBoundedText(body.title || body.assignmentTitle || lesson.lesson_name, 255);
    const description = normalizeText(body.description || body.brief || body.prompt);
    const maxScore = Math.max(1, toSafeNumber(body.maxScore ?? body.maximumScore ?? body.totalPoints, 100));

    if (!title || !description) {
      throw AppError.badRequest("Assignment title and description are required.");
    }

    const rubricCriteria = normalizeRubricCriteria(
      body.rubricCriteria || body.rubric || body.criteria,
      maxScore
    );

    const assignment = await assignmentRepository.upsertAssignment({
      courseId,
      chapterId,
      lessonId,
      title,
      description,
      instructions: normalizeText(body.instructions || body.submissionInstructions),
      submissionFormat: normalizeText(body.submissionFormat || body.answerFormat, "Tra loi bang van ban."),
      reviewFocus: normalizeText(body.reviewFocus || body.feedbackFocus),
      maxScore,
      rubricCriteria,
      sourceType: normalizeBoundedText(body.sourceType || body.createdBy, 50, "manual").toLowerCase(),
      status: normalizeBoundedText(body.status, 50, "active").toLowerCase(),
      userId,
    });

    if (lesson.lesson_type !== "assignment") {
      await courseRepository.updateLesson(lessonId, {
        lessonType: "assignment",
        updatedBy: userId,
      });
    }

    return mapAssignment(assignment, { courseId, chapterId, lessonId });
  },

  async getMyLessonAssignmentSubmission(courseId, chapterId, lessonId, userId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to view assignment submission.");
    }

    const course = await courseRepository.findByIdWithStructure(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    ensureActiveLessonInCourse(course, chapterId, lessonId);

    const lesson = await courseRepository.findLessonByIdWithContent(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    const submission = await assignmentRepository.findSubmissionByLessonAndUser(lessonId, userId);
    return mapAssignmentSubmission(submission);
  },

  async submitLessonAssignment(courseId, chapterId, lessonId, userId, body = {}) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to submit assignment.");
    }

    const answerText = normalizeText(body.answerText || body.submissionText || body.answer);
    if (!answerText) {
      throw AppError.badRequest("answerText is required.");
    }

    const [course, purchase] = await Promise.all([
      courseRepository.findByIdWithStructure(courseId),
      courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId),
    ]);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (!purchase) {
      throw AppError.forbidden("You need to enroll in this course before submitting assignment.");
    }

    ensureActiveLessonInCourse(course, chapterId, lessonId);

    let assignment = mapAssignment(await assignmentRepository.findAssignmentByLesson(lessonId), {
      courseId,
      chapterId,
      lessonId,
    });

    if (!assignment && body.assignment) {
      const saved = await this.upsertLessonAssignment(
        courseId,
        chapterId,
        lessonId,
        course.creator_id || userId,
        ["admin"],
        body.assignment
      );
      assignment = saved;
    }

    if (!assignment) {
      throw AppError.notFound("Assignment not found for this lesson.");
    }

    const grade = await gradeAssignmentSubmissionWithAi(assignment, answerText);
    const submission = await assignmentRepository.upsertSubmission({
      assignmentId: assignment.assignmentId,
      courseId,
      chapterId,
      lessonId,
      userId,
      answerText,
      score: grade.score,
      maxScore: assignment.maxScore,
      summary: grade.summary,
      strengths: grade.strengths,
      improvements: grade.improvements,
      rubricScores: grade.rubricScores,
      gradedAtUtc: new Date(),
      status: "graded",
    });

    await saveCourseLessonProgressSnapshot({
      purchase,
      courseId,
      userId,
      structure: getActiveCourseStructureFromCourse(course),
      lessonId,
      chapterId,
      completed: true,
    });

    return {
      ...mapAssignmentSubmission(submission),
      aiProvider: grade.aiProvider,
      aiModel: grade.aiModel,
    };
  },

  async listExpertAssignmentSubmissions(userId, roles = [], query = {}) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to view assignment submissions.");
    }

    const items = await assignmentRepository.listExpertSubmissions({
      userId,
      isAdmin: Array.isArray(roles) && roles.includes("admin"),
      status: normalizeText(query.status || "all").toLowerCase(),
      search: normalizeText(query.search),
      courseId: normalizeText(query.courseId),
      lessonId: normalizeText(query.lessonId),
    });

    return items.map(mapAssignmentSubmission);
  },

  async getExpertAssignmentSubmissionDetail(userId, roles = [], submissionId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to view assignment submission.");
    }

    const submission = await assignmentRepository.findSubmissionById(submissionId);
    if (!submission || submission.status === "deleted") {
      throw AppError.notFound("Assignment submission not found.");
    }

    const isAdmin = Array.isArray(roles) && roles.includes("admin");
    if (!isAdmin && submission.mst_courses?.creator_id !== userId) {
      throw AppError.forbidden("You can only view submissions for your own courses.");
    }

    return mapAssignmentSubmission(submission);
  },

  async addVideo(courseId, chapterId, lessonId, userId, body) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found");
    }

    const videoTitle = normalizeOptionalText(body.videoTitle) || normalizeOptionalText(body.title);
    const videoUrl = normalizeOptionalText(body.videoUrl) || normalizeOptionalText(body.url);
    const videoDescription =
      normalizeOptionalText(body.videoDescription) || normalizeOptionalText(body.description);

    if (!videoTitle) {
      throw AppError.badRequest("videoTitle is required");
    }
    if (!videoUrl) {
      throw AppError.badRequest("videoUrl is required");
    }

    const video = await courseRepository.createVideo({
      videoTitle,
      videoDescription,
      videoUrl,
      videoThumbnailUrl: normalizeOptionalText(body.videoThumbnailUrl),
      videoDurationSeconds: normalizeOptionalInteger(body.videoDurationSeconds),
      videoFormat: normalizeOptionalText(body.videoFormat),
      fileSizeBytes: normalizeOptionalBigInt(body.fileSizeBytes),
      uploaderId: userId,
      lessonId,
      courseId,
      visibility: normalizeOptionalText(body.visibility),
      status: "active",
      createdBy: userId,
    });

    await courseRepository.adjustContentStats(courseId, { videos: 1 });
    return courseDto.toVideoItem(video);
  },

  async deleteVideo(courseId, chapterId, lessonId, videoId, userId) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, video] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findVideoById(videoId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!video || video.lesson_id !== lessonId) throw AppError.notFound("Video not found");

    await courseRepository.deleteVideo(videoId, userId);
    await courseRepository.adjustContentStats(courseId, { videos: -1 });
    return { deleted: true, videoId };
  },

  async addDocument(courseId, chapterId, lessonId, userId, file, body = {}) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found");
    }

    const visibility = normalizeOptionalText(body.visibility);
    if (visibility && !VALID_CONTENT_VISIBILITY.has(visibility)) {
      throw AppError.badRequest("Invalid visibility");
    }

    const requestTitle = normalizeOptionalText(body.documentTitle) || normalizeOptionalText(body.title);
    const requestDescription =
      normalizeOptionalText(body.documentDescription) || normalizeOptionalText(body.description);
    const requestFileUrl =
      normalizeOptionalText(body.fileUrl) ||
      normalizeOptionalText(body.url) ||
      normalizeOptionalText(body.documentUrl);
    const requestFileName = normalizeOptionalText(body.fileName) || normalizeOptionalText(body.name);
    const requestFileType =
      (normalizeOptionalText(body.fileType) ||
        normalizeOptionalText(body.type) ||
        normalizeOptionalText(body.documentType))?.toLowerCase();

    const resolvedFileUrl = file ? `/uploads/documents/${file.filename}` : requestFileUrl;
    if (!resolvedFileUrl) {
      throw AppError.badRequest("Document file or fileUrl is required");
    }

    const resolvedFileName =
      file?.originalname || requestFileName || getFileNameFromUrl(resolvedFileUrl);
    if (!resolvedFileName) {
      throw AppError.badRequest("fileName is required");
    }

    const resolvedTitle = requestTitle || resolvedFileName;
    const resolvedFileType =
      getFileTypeFromName(file?.originalname || file?.filename || resolvedFileName) ||
      requestFileType ||
      null;

    const doc = await courseRepository.createDocumentRecord({
      documentTitle: resolvedTitle,
      documentDescription: requestDescription,
      fileName: resolvedFileName,
      fileUrl: resolvedFileUrl,
      fileType: resolvedFileType,
      fileSizeBytes:
        file?.size != null ? BigInt(file.size) : normalizeOptionalBigInt(body.fileSizeBytes),
      pageCount: normalizeOptionalInteger(body.pageCount),
      uploaderId: userId,
      lessonId,
      courseId,
      visibility,
      status: "active",
      createdBy: userId,
    });

    await courseRepository.adjustContentStats(courseId, { documents: 1 });
    return courseDto.toDocumentItem(doc);
  },

  async deleteDocument(courseId, chapterId, lessonId, documentId, userId) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    const doc = await courseRepository.findDocumentById(documentId);
    if (!doc || doc.lesson_id !== lessonId) throw AppError.notFound("Document not found");

    await courseRepository.deleteDocument(documentId, userId);
    await courseRepository.adjustContentStats(courseId, { documents: -1 });
    return { deleted: true, documentId };
  },

  async addQuestion(courseId, chapterId, lessonId, userId, body) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, chapter, lesson] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found");
    }

    const question = await courseRepository.createQuestion({
      questionType: body.questionType || "multiple_choice",
      questionText: body.questionText,
      questionExplanation: body.questionExplanation,
      difficultyLevel: body.difficultyLevel,
      points: body.points,
      timeLimitSeconds: body.timeLimitSeconds,
      creatorId: userId,
      lessonId,
      courseId,
      visibility: body.visibility,
      status: "active",
      createdBy: userId,
      options: body.options,
    });

    await courseRepository.adjustContentStats(courseId, { questions: 1 });
    return courseDto.toQuestionItem(question);
  },

  async deleteQuestion(courseId, chapterId, lessonId, questionId, userId) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, question] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findQuestionById(questionId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!question || question.lesson_id !== lessonId) throw AppError.notFound("Question not found");

    await courseRepository.deleteQuestion(questionId, userId);
    await courseRepository.adjustContentStats(courseId, { questions: -1 });
    return { deleted: true, questionId };
  },

  // ──────────────── ASSIGN EXPERT ────────────────

  async assignExpert(courseId, expertId, adminUserId) {
    if (!adminUserId) {
      throw AppError.unauthorized("Authentication required to assign expert.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    // Validate expert exists and has creator role
    const expert = await userRepository.findByIdWithRoles(expertId);
    if (!expert || !expert.is_active) {
      throw AppError.notFound("Expert not found");
    }

    const hasCreatorRole = expert.mst_user_roles?.some(
      (ur) => ur.is_active && ur.mst_roles?.role_code === "creator"
    );
    if (!hasCreatorRole) {
      throw AppError.badRequest("Selected user does not have the creator/expert role");
    }

    await courseRepository.assignCreator(courseId, expertId, adminUserId);

    const updated = await courseRepository.findByIdWithStructure(courseId);
    return courseDto.toDetail(updated);
  },
};

module.exports = courseService;
