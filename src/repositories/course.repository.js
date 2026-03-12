const prisma = require("../config/prisma");

const courseRepository = {
  // ──────────────── COURSES ────────────────

  async findMany({ where, orderBy, skip, take }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.mst_courses.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          mst_users: {
            select: {
              user_id: true,
              full_name: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.mst_courses.count({ where }),
    ]);

    return { items, totalItems };
  },

  async findById(courseId) {
    return prisma.mst_courses.findUnique({
      where: { course_id: courseId },
      include: {
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
          },
        },
        mst_chapters: {
          where: { is_active: true },
          orderBy: { display_order: "asc" },
          select: {
            chapter_id: true,
            chapter_code: true,
            chapter_name: true,
            chapter_description: true,
            chapter_number: true,
            display_order: true,
            estimated_duration_minutes: true,
            _count: {
              select: { mst_lessons: { where: { is_active: true } } },
            },
            mst_lessons: {
              where: { is_active: true },
              orderBy: { display_order: "asc" },
              select: {
                lesson_id: true,
                lesson_code: true,
                lesson_name: true,
                lesson_description: true,
                lesson_number: true,
                display_order: true,
                learning_objectives: true,
                estimated_duration_minutes: true,
              },
            },
          },
        },
      },
    });
  },

  async findByCode(courseCode) {
    return prisma.mst_courses.findUnique({
      where: { course_code: courseCode },
    });
  },

  async create(data) {
    return prisma.mst_courses.create({
      data: {
        course_code: data.courseCode,
        course_name: data.courseName,
        course_description: data.courseDescription ?? null,
        course_icon_url: data.courseIconUrl ?? null,
        course_banner_url: data.courseBannerUrl ?? null,
        course_preview_video_url: data.coursePreviewVideoUrl ?? null,
        display_order: data.displayOrder ?? 0,
        creator_id: data.creatorId,
        is_free: data.isFree ?? true,
        price_amount: data.priceAmount ?? 0,
        original_price: data.originalPrice ?? null,
        currency_code: data.currencyCode ?? "VND",
        discount_percent: data.discountPercent ?? 0,
        discount_valid_until_utc: data.discountValidUntil ?? null,
        estimated_duration_hours: data.estimatedDurationHours ?? null,
        is_featured: data.isFeatured ?? false,
        status: data.status ?? "draft",
        created_by: data.createdBy,
      },
    });
  },

  async update(courseId, data) {
    return prisma.mst_courses.update({
      where: { course_id: courseId },
      data: {
        ...(data.courseCode != null && { course_code: data.courseCode }),
        ...(data.courseName != null && { course_name: data.courseName }),
        ...(data.courseDescription !== undefined && { course_description: data.courseDescription }),
        ...(data.courseIconUrl !== undefined && { course_icon_url: data.courseIconUrl }),
        ...(data.courseBannerUrl !== undefined && { course_banner_url: data.courseBannerUrl }),
        ...(data.coursePreviewVideoUrl !== undefined && { course_preview_video_url: data.coursePreviewVideoUrl }),
        ...(data.displayOrder != null && { display_order: data.displayOrder }),
        ...(data.isFree != null && { is_free: data.isFree }),
        ...(data.priceAmount != null && { price_amount: data.priceAmount }),
        ...(data.originalPrice !== undefined && { original_price: data.originalPrice }),
        ...(data.currencyCode != null && { currency_code: data.currencyCode }),
        ...(data.discountPercent != null && { discount_percent: data.discountPercent }),
        ...(data.discountValidUntil !== undefined && { discount_valid_until_utc: data.discountValidUntil }),
        ...(data.estimatedDurationHours !== undefined && { estimated_duration_hours: data.estimatedDurationHours }),
        ...(data.isFeatured != null && { is_featured: data.isFeatured }),
        ...(data.status != null && { status: data.status }),
        ...(data.publishedAtUtc !== undefined && { published_at_utc: data.publishedAtUtc }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async softDelete(courseId, userId) {
    return prisma.mst_courses.update({
      where: { course_id: courseId },
      data: {
        is_active: false,
        status: "archived",
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async updateStats(courseId) {
    const [chapterCount, lessonCount, videoCount, documentCount, questionCount] =
      await prisma.$transaction([
        prisma.mst_chapters.count({ where: { course_id: courseId, is_active: true } }),
        prisma.mst_lessons.count({
          where: { mst_chapters: { course_id: courseId, is_active: true }, is_active: true },
        }),
        prisma.cnt_videos.count({ where: { course_id: courseId, status: { not: "deleted" } } }),
        prisma.cnt_documents.count({ where: { course_id: courseId, status: { not: "deleted" } } }),
        prisma.cnt_questions.count({ where: { course_id: courseId, status: { not: "deleted" } } }),
      ]);

    return prisma.mst_courses.update({
      where: { course_id: courseId },
      data: {
        total_chapters: chapterCount,
        total_lessons: lessonCount,
        total_videos: videoCount,
        total_documents: documentCount,
        total_questions: questionCount,
      },
    });
  },

  // ──────────────── CHAPTERS ────────────────

  async findChapterById(chapterId) {
    return prisma.mst_chapters.findUnique({
      where: { chapter_id: chapterId },
      include: {
        mst_lessons: {
          where: { is_active: true },
          orderBy: { display_order: "asc" },
        },
      },
    });
  },

  async findChapterByCode(courseId, chapterCode) {
    return prisma.mst_chapters.findUnique({
      where: { course_id_chapter_code: { course_id: courseId, chapter_code: chapterCode } },
    });
  },

  async createChapter(data) {
    return prisma.mst_chapters.create({
      data: {
        course_id: data.courseId,
        chapter_code: data.chapterCode,
        chapter_name: data.chapterName,
        chapter_description: data.chapterDescription ?? null,
        chapter_number: data.chapterNumber ?? null,
        display_order: data.displayOrder ?? 0,
        estimated_duration_minutes: data.estimatedDurationMinutes ?? null,
        created_by: data.createdBy,
      },
    });
  },

  async updateChapter(chapterId, data) {
    return prisma.mst_chapters.update({
      where: { chapter_id: chapterId },
      data: {
        ...(data.chapterCode != null && { chapter_code: data.chapterCode }),
        ...(data.chapterName != null && { chapter_name: data.chapterName }),
        ...(data.chapterDescription !== undefined && { chapter_description: data.chapterDescription }),
        ...(data.chapterNumber != null && { chapter_number: data.chapterNumber }),
        ...(data.displayOrder != null && { display_order: data.displayOrder }),
        ...(data.estimatedDurationMinutes !== undefined && { estimated_duration_minutes: data.estimatedDurationMinutes }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async softDeleteChapter(chapterId, userId) {
    return prisma.mst_chapters.update({
      where: { chapter_id: chapterId },
      data: {
        is_active: false,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async getMaxChapterOrder(courseId) {
    const agg = await prisma.mst_chapters.aggregate({
      where: { course_id: courseId, is_active: true },
      _max: { display_order: true },
    });
    return agg._max?.display_order ?? 0;
  },

  // ──────────────── LESSONS ────────────────

  async findLessonById(lessonId) {
    return prisma.mst_lessons.findUnique({
      where: { lesson_id: lessonId },
    });
  },

  async findLessonByCode(chapterId, lessonCode) {
    return prisma.mst_lessons.findUnique({
      where: { chapter_id_lesson_code: { chapter_id: chapterId, lesson_code: lessonCode } },
    });
  },

  async createLesson(data) {
    return prisma.mst_lessons.create({
      data: {
        chapter_id: data.chapterId,
        lesson_code: data.lessonCode,
        lesson_name: data.lessonName,
        lesson_description: data.lessonDescription ?? null,
        lesson_number: data.lessonNumber ?? null,
        display_order: data.displayOrder ?? 0,
        learning_objectives: data.learningObjectives ?? null,
        estimated_duration_minutes: data.estimatedDurationMinutes ?? null,
        created_by: data.createdBy,
      },
    });
  },

  async updateLesson(lessonId, data) {
    return prisma.mst_lessons.update({
      where: { lesson_id: lessonId },
      data: {
        ...(data.lessonCode != null && { lesson_code: data.lessonCode }),
        ...(data.lessonName != null && { lesson_name: data.lessonName }),
        ...(data.lessonDescription !== undefined && { lesson_description: data.lessonDescription }),
        ...(data.lessonNumber != null && { lesson_number: data.lessonNumber }),
        ...(data.displayOrder != null && { display_order: data.displayOrder }),
        ...(data.learningObjectives !== undefined && { learning_objectives: data.learningObjectives }),
        ...(data.estimatedDurationMinutes !== undefined && { estimated_duration_minutes: data.estimatedDurationMinutes }),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
    });
  },

  async softDeleteLesson(lessonId, userId) {
    return prisma.mst_lessons.update({
      where: { lesson_id: lessonId },
      data: {
        is_active: false,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async getMaxLessonOrder(chapterId) {
    const agg = await prisma.mst_lessons.aggregate({
      where: { chapter_id: chapterId, is_active: true },
      _max: { display_order: true },
    });
    return agg._max?.display_order ?? 0;
  },
};

module.exports = courseRepository;
