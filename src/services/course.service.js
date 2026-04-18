const path = require("path");
const AppError = require("../utils/AppError");
const courseRepository = require("../repositories/course.repository");
const courseProgressRepository = require("../repositories/course-progress.repository");
const userRepository = require("../repositories/user.repository");
const courseDto = require("../dtos/course.dto");
const { isMissingTableError } = require("../utils/prisma.util");

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
const OPTION_BASED_QUESTION_TYPES = new Set(["multiple_choice", "true_false"]);

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

function normalizeRequiredPatchText(value, fieldName) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) {
    throw AppError.badRequest(`${fieldName} cannot be empty`);
  }

  return trimmed;
}

function normalizeOptionalPatchText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeQuestionOptionsForUpdate(options, questionType) {
  if (options === undefined) return undefined;
  if (!Array.isArray(options)) return options;

  const normalized = options.map((option, index) => {
    const optionText = normalizeRequiredPatchText(option?.optionText, `options[${index}].optionText`);

    return {
      optionText,
      optionOrder:
        option?.optionOrder !== undefined
          ? normalizeOptionalInteger(option.optionOrder)
          : index,
      isCorrect: option?.isCorrect === true,
      optionExplanation: normalizeOptionalPatchText(option?.optionExplanation),
    };
  });

  if (OPTION_BASED_QUESTION_TYPES.has(questionType)) {
    if (normalized.length < 2) {
      throw AppError.badRequest("Option-based questions must contain at least 2 options");
    }

    if (!normalized.some((option) => option.isCorrect)) {
      throw AppError.badRequest("Option-based questions must contain at least 1 correct option");
    }
  } else if (!normalized.some((option) => option.isCorrect)) {
    throw AppError.badRequest("Questions with options must contain at least 1 correct option");
  }

  return normalized;
}

function getMostRecentDate(dates = []) {
  return dates
    .filter(Boolean)
    .reduce((latest, current) => {
      if (!latest) return current;
      return new Date(current) > new Date(latest) ? current : latest;
    }, null);
}

function buildCourseProgressSnapshot({ courseId, learnerId, purchase, structure, progressRows }) {
  const orderedLessonIds = [];
  const chapters = (structure || []).map((chapter) => {
    const lessonIds = (chapter.mst_lessons || []).map((lesson) => lesson.lesson_id);
    orderedLessonIds.push(...lessonIds);

    return {
      chapterId: chapter.chapter_id,
      lessonIds,
    };
  });

  const activeLessonIdSet = new Set(orderedLessonIds);
  const completedSet = new Set(
    (progressRows || [])
      .filter((row) => row.completed === true && activeLessonIdSet.has(row.lesson_id))
      .map((row) => row.lesson_id)
  );
  const completedLessonIds = orderedLessonIds.filter((lessonId) => completedSet.has(lessonId));
  const totalLessons = orderedLessonIds.length;
  const completedLessons = completedLessonIds.length;
  const chaptersCompleted = chapters.filter(
    (chapter) =>
      chapter.lessonIds.length > 0 && chapter.lessonIds.every((lessonId) => completedSet.has(lessonId))
  ).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const updatedAt = getMostRecentDate([
    purchase?.updated_at_utc,
    purchase?.created_at_utc,
    ...(progressRows || []).flatMap((row) => [row.updated_at_utc, row.created_at_utc, row.completed_at_utc]),
  ]);

  return {
    courseId,
    learnerId,
    totalLessons,
    completedLessons,
    chaptersCompleted,
    progressPercent,
    completedLessonIds,
    updatedAt,
  };
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

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const purchase = await courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId);
    if (!purchase || purchase.status !== "active") {
      throw AppError.forbidden("You are not enrolled in this course");
    }

    let structure;
    let progressRows;
    try {
      [structure, progressRows] = await Promise.all([
        courseProgressRepository.findActiveCourseStructure(courseId),
        courseProgressRepository.findLessonProgressRows(purchase.purchase_id),
      ]);
    } catch (error) {
      if (isMissingTableError(error, "lrn_course_lesson_progress")) {
        throw AppError.serviceUnavailable(
          "Course progress storage is not initialized. Please create table lrn_subject_lesson_progress first."
        );
      }
      throw error;
    }

    return buildCourseProgressSnapshot({
      courseId,
      learnerId: userId,
      purchase,
      structure,
      progressRows,
    });
  },

  async updateCourseProgress(courseId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update course progress.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const purchase = await courseProgressRepository.findPurchaseByUserAndCourse(userId, courseId);
    if (!purchase || purchase.status !== "active") {
      throw AppError.forbidden("You are not enrolled in this course");
    }

    const lesson = await courseProgressRepository.findLessonContext(body.lessonId);
    if (!lesson || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found");
    }

    const lessonChapter = lesson.mst_chapters;
    if (!lessonChapter || lessonChapter.is_active === false || lessonChapter.course_id !== courseId) {
      throw AppError.badRequest("Lesson does not belong to this course");
    }

    if (body.chapterId && lesson.chapter_id !== body.chapterId) {
      throw AppError.badRequest("Lesson does not belong to the provided chapter");
    }

    let structure;
    let existingRows;
    try {
      [structure, existingRows] = await Promise.all([
        courseProgressRepository.findActiveCourseStructure(courseId),
        courseProgressRepository.findLessonProgressRows(purchase.purchase_id),
      ]);
    } catch (error) {
      if (isMissingTableError(error, "lrn_course_lesson_progress")) {
        throw AppError.serviceUnavailable(
          "Course progress storage is not initialized. Please create table lrn_subject_lesson_progress first."
        );
      }
      throw error;
    }

    const updatedAt = new Date();
    const targetChapterId = body.chapterId || lesson.chapter_id;
    const targetIndex = existingRows.findIndex((row) => row.lesson_id === body.lessonId);
    const nextRows = [...existingRows];

    if (targetIndex >= 0) {
      nextRows[targetIndex] = {
        ...nextRows[targetIndex],
        chapter_id: targetChapterId,
        completed: body.completed,
        completed_at_utc: body.completed
          ? nextRows[targetIndex].completed_at_utc || updatedAt
          : null,
        updated_at_utc: updatedAt,
      };
    } else {
      nextRows.push({
        lesson_id: body.lessonId,
        chapter_id: targetChapterId,
        completed: body.completed,
        completed_at_utc: body.completed ? updatedAt : null,
        created_at_utc: updatedAt,
        updated_at_utc: updatedAt,
      });
    }

    const snapshot = buildCourseProgressSnapshot({
      courseId,
      learnerId: userId,
      purchase: {
        ...purchase,
        updated_at_utc: updatedAt,
      },
      structure,
      progressRows: nextRows,
    });

    const completedAtUtc =
      snapshot.totalLessons > 0 && snapshot.completedLessons === snapshot.totalLessons
        ? updatedAt
        : null;

    try {
      await courseProgressRepository.saveLessonProgressAndPurchaseSnapshot({
        purchaseId: purchase.purchase_id,
        courseId,
        userId,
        chapterId: targetChapterId,
        lessonId: body.lessonId,
        completed: body.completed,
        completedLessons: snapshot.completedLessons,
        chaptersCompleted: snapshot.chaptersCompleted,
        progressPercent: snapshot.progressPercent,
        totalLessons: snapshot.totalLessons,
        completedAtUtc,
        updatedAt,
      });
    } catch (error) {
      if (isMissingTableError(error, "lrn_course_lesson_progress")) {
        throw AppError.serviceUnavailable(
          "Course progress storage is not initialized. Please create table lrn_subject_lesson_progress first."
        );
      }
      throw error;
    }

    return {
      ...snapshot,
      lessonId: body.lessonId,
      chapterId: targetChapterId,
      completed: body.completed,
      updatedAt,
    };
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

  async updateQuestion(courseId, chapterId, lessonId, questionId, userId, body) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const [course, chapter, lesson, question] = await Promise.all([
      courseRepository.findById(courseId),
      courseRepository.findChapterById(chapterId),
      courseRepository.findLessonById(lessonId),
      courseRepository.findQuestionById(questionId),
    ]);
    if (!course || !course.is_active) throw AppError.notFound("Course not found");
    if (course.creator_id !== userId) throw AppError.forbidden("Not authorized");

    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found");
    }

    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found");
    }

    if (!question || question.lesson_id !== lessonId || question.status === "deleted") {
      throw AppError.notFound("Question not found");
    }

    const questionType = body.questionType ?? body.type;
    const questionText = normalizeRequiredPatchText(body.questionText, "questionText");
    const questionExplanation = normalizeOptionalPatchText(
      body.questionExplanation !== undefined ? body.questionExplanation : body.explanation
    );
    const difficultyLevel = body.difficultyLevel ?? body.difficulty;
    const options = normalizeQuestionOptionsForUpdate(
      body.options,
      questionType ?? question.question_type
    );

    if (
      questionType === undefined &&
      questionText === undefined &&
      questionExplanation === undefined &&
      difficultyLevel === undefined &&
      options === undefined
    ) {
      throw AppError.badRequest("At least one updatable field is required");
    }

    const updated = await courseRepository.updateQuestion(questionId, {
      questionType,
      questionText,
      questionExplanation,
      difficultyLevel,
      options,
      updatedBy: userId,
    });

    return courseDto.toQuestionItem(updated);
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
