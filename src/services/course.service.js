const AppError = require("../utils/AppError");
const courseRepository = require("../repositories/course.repository");
const courseDto = require("../dtos/course.dto");

const ALLOWED_SORT_FIELDS = {
  createdAt: "created_at_utc",
  publishedAt: "published_at_utc",
  courseName: "course_name",
  displayOrder: "display_order",
  priceAmount: "price_amount",
  purchaseCount: "purchase_count",
  ratingAverage: "rating_average",
};

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

    if (query.status) {
      where.status = query.status;
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
    const course = await courseRepository.findById(courseId);

    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    return courseDto.toDetail(course);
  },

  async createCourse(userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a course.");
    }

    const existing = await courseRepository.findByCode(body.courseCode);
    if (existing) {
      throw AppError.conflict(`Course code "${body.courseCode}" already exists`);
    }

    const course = await courseRepository.create({
      courseCode: body.courseCode,
      courseName: body.courseName,
      courseDescription: body.courseDescription,
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

    const full = await courseRepository.findById(course.course_id);
    return courseDto.toDetail(full);
  },

  async updateCourse(courseId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to update a course.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (course.creator_id !== userId) {
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

    const updated = await courseRepository.findById(courseId);
    return courseDto.toDetail(updated);
  },

  async deleteCourse(courseId, userId) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to delete a course.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    if (course.creator_id !== userId) {
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

    return (course.mst_chapters || []).map(courseDto.toChapterItem);
  },

  async createChapter(courseId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a chapter.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only add chapters to your own courses");
    }

    const existing = await courseRepository.findChapterByCode(courseId, body.chapterCode);
    if (existing) {
      throw AppError.conflict(`Chapter code "${body.chapterCode}" already exists in this course`);
    }

    const displayOrder = body.displayOrder ?? (await courseRepository.getMaxChapterOrder(courseId)) + 1;

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

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit chapters in your own courses");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
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

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only delete chapters from your own courses");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    await courseRepository.softDeleteChapter(chapterId, userId);
    await courseRepository.updateStats(courseId);

    return { deleted: true, chapterId };
  },

  // ──────────────── LESSONS ────────────────

  async getLessons(courseId, chapterId) {
    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    return (chapter.mst_lessons || []).filter((l) => l.is_active !== false).map(courseDto.toLessonItem);
  },

  async createLesson(courseId, chapterId, userId, body) {
    if (!userId) {
      throw AppError.unauthorized("Authentication required to create a lesson.");
    }

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only add lessons to your own courses");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    const existing = await courseRepository.findLessonByCode(chapterId, body.lessonCode);
    if (existing) {
      throw AppError.conflict(`Lesson code "${body.lessonCode}" already exists in this chapter`);
    }

    const displayOrder = body.displayOrder ?? (await courseRepository.getMaxLessonOrder(chapterId)) + 1;

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

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only edit lessons in your own courses");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    const lesson = await courseRepository.findLessonById(lessonId);
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

    const course = await courseRepository.findById(courseId);
    if (!course || !course.is_active) {
      throw AppError.notFound("Course not found");
    }
    if (course.creator_id !== userId) {
      throw AppError.forbidden("You can only delete lessons from your own courses");
    }

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId || !chapter.is_active) {
      throw AppError.notFound("Chapter not found in this course");
    }

    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId || lesson.is_active === false) {
      throw AppError.notFound("Lesson not found in this chapter");
    }

    await courseRepository.softDeleteLesson(lessonId, userId);
    await courseRepository.updateStats(courseId);

    return { deleted: true, lessonId };
  },
};

module.exports = courseService;
