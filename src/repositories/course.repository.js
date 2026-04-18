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
      select: {
        course_id: true,
        course_code: true,
        course_name: true,
        creator_id: true,
        status: true,
        is_active: true,
      },
    });
  },

  async findByIdWithStructure(courseId) {
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
                lesson_type: true,
                display_order: true,
                learning_objectives: true,
                estimated_duration_minutes: true,
                _count: {
                  select: {
                    cnt_videos: { where: { status: { not: "deleted" } } },
                    cnt_documents: { where: { status: { not: "deleted" } } },
                    cnt_questions: { where: { status: { not: "deleted" } } },
                    cnt_flashcards: { where: { status: { not: "archived" } } },
                  },
                },
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
        category: data.category ?? null,
        course_icon_url: data.courseIconUrl ?? null,
        course_banner_url: data.courseBannerUrl ?? null,
        course_preview_video_url: data.coursePreviewVideoUrl ?? null,
        display_order: data.displayOrder ?? 0,
        creator_id: data.creatorId,
        is_free: data.isFree ?? false,
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
        ...(data.category !== undefined && { category: data.category }),
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

  async updateCommerceStats(courseId, db = prisma) {
    const purchaseWhere = {
      course_id: courseId,
      status: { in: ["active", "completed"] },
      OR: [
        { order_id: null },
        {
          pmt_orders: {
            payment_status: "completed",
            cancelled_at_utc: null,
            refunded_at_utc: null,
          },
        },
      ],
    };

    const [purchaseCount, ratingAggregate] = await Promise.all([
      db.pmt_course_purchases.count({
        where: purchaseWhere,
      }),
      db.pmt_course_purchases.aggregate({
        where: {
          ...purchaseWhere,
          user_rating: { not: null },
        },
        _avg: { user_rating: true },
        _count: { user_rating: true },
      }),
    ]);

    return db.mst_courses.update({
      where: { course_id: courseId },
      data: {
        purchase_count: purchaseCount,
        rating_average: ratingAggregate._avg.user_rating ?? null,
        rating_count: ratingAggregate._count.user_rating || 0,
      },
    });
  },

  async adjustContentStats(courseId, { videos = 0, documents = 0, questions = 0 } = {}) {
    const deltaVideos = Number(videos) || 0;
    const deltaDocuments = Number(documents) || 0;
    const deltaQuestions = Number(questions) || 0;

    if (!deltaVideos && !deltaDocuments && !deltaQuestions) {
      return null;
    }

    return prisma.$executeRaw`
      UPDATE mst_subjects
      SET
        total_videos = GREATEST(COALESCE(total_videos, 0) + ${deltaVideos}, 0),
        total_documents = GREATEST(COALESCE(total_documents, 0) + ${deltaDocuments}, 0),
        total_questions = GREATEST(COALESCE(total_questions, 0) + ${deltaQuestions}, 0),
        updated_at_utc = NOW()
      WHERE subject_id = ${courseId}::uuid
    `;
  },

  // ──────────────── CHAPTERS ────────────────

  async findChapterById(chapterId) {
    return prisma.mst_chapters.findUnique({
      where: { chapter_id: chapterId },
      select: {
        chapter_id: true,
        chapter_code: true,
        chapter_name: true,
        course_id: true,
        is_active: true,
        display_order: true,
      },
    });
  },

  async findChapterByIdWithLessons(chapterId) {
    return prisma.mst_chapters.findUnique({
      where: { chapter_id: chapterId },
      include: {
        mst_lessons: {
          where: { is_active: true },
          orderBy: { display_order: "asc" },
          include: {
            _count: {
              select: {
                cnt_videos: { where: { status: { not: "deleted" } } },
                cnt_documents: { where: { status: { not: "deleted" } } },
                cnt_questions: { where: { status: { not: "deleted" } } },
                cnt_flashcards: { where: { status: { not: "archived" } } },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Chapters + lessons with content counts for list endpoints (avoids loading full course + creator).
   */
  async findChaptersWithLessonsForList(courseId) {
    return prisma.mst_chapters.findMany({
      where: { course_id: courseId, is_active: true },
      orderBy: { display_order: "asc" },
      include: {
        mst_lessons: {
          where: { is_active: true },
          orderBy: { display_order: "asc" },
          include: {
            _count: {
              select: {
                cnt_videos: { where: { status: { not: "deleted" } } },
                cnt_documents: { where: { status: { not: "deleted" } } },
                cnt_questions: { where: { status: { not: "deleted" } } },
                cnt_flashcards: { where: { status: { not: "archived" } } },
              },
            },
          },
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

  async findLessonByIdWithContent(lessonId) {
    return prisma.mst_lessons.findUnique({
      where: { lesson_id: lessonId },
      include: {
        cnt_videos: {
          where: { status: { not: "deleted" } },
          orderBy: { created_at_utc: "desc" },
          select: {
            video_id: true,
            video_title: true,
            video_description: true,
            video_url: true,
            video_thumbnail_url: true,
            video_duration_seconds: true,
            video_format: true,
            file_size_bytes: true,
            status: true,
            created_at_utc: true,
          },
        },
        cnt_documents: {
          where: { status: { not: "deleted" } },
          orderBy: { created_at_utc: "desc" },
          select: {
            document_id: true,
            document_title: true,
            document_description: true,
            file_name: true,
            file_url: true,
            file_type: true,
            file_size_bytes: true,
            page_count: true,
            status: true,
            created_at_utc: true,
          },
        },
        cnt_questions: {
          where: { status: { not: "deleted" } },
          orderBy: { created_at_utc: "desc" },
          select: {
            question_id: true,
            question_type: true,
            question_text: true,
            question_explanation: true,
            difficulty_level: true,
            points: true,
            time_limit_seconds: true,
            status: true,
            created_at_utc: true,
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
        cnt_flashcards: {
          where: { status: { not: "archived" } },
          orderBy: { created_at_utc: "desc" },
          select: {
            flashcard_set_id: true,
            set_title: true,
            set_description: true,
            set_cover_image_url: true,
            total_cards: true,
            visibility: true,
            status: true,
            created_at_utc: true,
            updated_at_utc: true,
            cnt_flashcard_items: {
              where: { status: { not: "inactive" } },
              orderBy: { card_order: "asc" },
              select: {
                flashcard_item_id: true,
                front_text: true,
                back_text: true,
                front_image_url: true,
                back_image_url: true,
                card_order: true,
                hint_text: true,
                ease_factor: true,
                interval_days: true,
                status: true,
                created_at_utc: true,
                updated_at_utc: true,
              },
            },
          },
        },
      },
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
        lesson_type: data.lessonType ?? "video",
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
        ...(data.lessonType !== undefined && { lesson_type: data.lessonType }),
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

  async assignCreator(courseId, creatorId, updatedBy) {
    return prisma.mst_courses.update({
      where: { course_id: courseId },
      data: {
        creator_id: creatorId,
        updated_by: updatedBy,
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

  // ──────────────── LESSON CONTENT ────────────────

  async createVideo(data) {
    return prisma.cnt_videos.create({
      data: {
        video_title: data.videoTitle,
        video_description: data.videoDescription ?? null,
        video_url: data.videoUrl,
        video_thumbnail_url: data.videoThumbnailUrl ?? null,
        video_duration_seconds: data.videoDurationSeconds ?? null,
        video_format: data.videoFormat ?? null,
        file_size_bytes: data.fileSizeBytes ?? null,
        uploader_id: data.uploaderId,
        lesson_id: data.lessonId,
        course_id: data.courseId ?? null,
        visibility: data.visibility ?? "private",
        status: data.status ?? "active",
        created_by: data.createdBy,
      },
    });
  },

  async deleteVideo(videoId, userId) {
    return prisma.cnt_videos.update({
      where: { video_id: videoId },
      data: {
        status: "deleted",
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async findVideoById(videoId) {
    return prisma.cnt_videos.findUnique({ where: { video_id: videoId } });
  },

  async createDocumentRecord(data) {
    return prisma.cnt_documents.create({
      data: {
        document_title: data.documentTitle,
        document_description: data.documentDescription ?? null,
        file_name: data.fileName,
        file_url: data.fileUrl,
        file_type: data.fileType ?? null,
        file_size_bytes: data.fileSizeBytes ?? null,
        page_count: data.pageCount ?? null,
        uploader_id: data.uploaderId,
        lesson_id: data.lessonId,
        course_id: data.courseId ?? null,
        visibility: data.visibility ?? "private",
        status: data.status ?? "active",
        created_by: data.createdBy,
      },
    });
  },

  async deleteDocument(documentId, userId) {
    return prisma.cnt_documents.update({
      where: { document_id: documentId },
      data: {
        status: "deleted",
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async findDocumentById(documentId) {
    return prisma.cnt_documents.findUnique({ where: { document_id: documentId } });
  },

  async createQuestion(data) {
    return prisma.cnt_questions.create({
      data: {
        question_type: data.questionType,
        question_text: data.questionText,
        question_explanation: data.questionExplanation ?? null,
        difficulty_level: data.difficultyLevel ?? "medium",
        points: data.points ?? 1.0,
        time_limit_seconds: data.timeLimitSeconds ?? null,
        creator_id: data.creatorId,
        lesson_id: data.lessonId,
        course_id: data.courseId ?? null,
        visibility: data.visibility ?? "private",
        status: data.status ?? "active",
        created_by: data.createdBy,
        cnt_question_options: data.options?.length
          ? {
              create: data.options.map((opt, idx) => ({
                option_text: opt.optionText,
                option_order: opt.optionOrder ?? idx,
                is_correct: opt.isCorrect ?? false,
                option_explanation: opt.optionExplanation ?? null,
                created_by: data.createdBy,
              })),
            }
          : undefined,
      },
      include: {
        cnt_question_options: {
          orderBy: { option_order: "asc" },
        },
      },
    });
  },

  async deleteQuestion(questionId, userId) {
    return prisma.cnt_questions.update({
      where: { question_id: questionId },
      data: {
        status: "deleted",
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async findQuestionById(questionId) {
    return prisma.cnt_questions.findUnique({
      where: { question_id: questionId },
      include: {
        cnt_question_options: {
          where: { status: { not: "deleted" } },
          orderBy: { option_order: "asc" },
        },
      },
    });
  },
};

module.exports = courseRepository;
