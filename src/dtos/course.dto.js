function toListItem(course) {
  return {
    courseId: course.course_id,
    courseCode: course.course_code,
    courseName: course.course_name,
    courseDescription: course.course_description,
    category: course.category,
    courseIconUrl: course.course_icon_url,
    courseBannerUrl: course.course_banner_url,
    displayOrder: course.display_order,
    isFree: course.is_free,
    priceAmount: course.price_amount,
    originalPrice: course.original_price,
    currencyCode: course.currency_code,
    discountPercent: course.discount_percent,
    discountValidUntil: course.discount_valid_until_utc,
    totalChapters: course.total_chapters,
    totalLessons: course.total_lessons,
    estimatedDurationHours: course.estimated_duration_hours,
    purchaseCount: course.purchase_count,
    ratingAverage: course.rating_average,
    ratingCount: course.rating_count,
    isFeatured: course.is_featured,
    status: course.status,
    publishedAt: course.published_at_utc,
    creator: course.mst_users
      ? {
        userId: course.mst_users.user_id,
        fullName: course.mst_users.full_name,
        displayName: course.mst_users.display_name,
        avatarUrl: course.mst_users.avatar_url,
      }
      : null,
  };
}

function toDetail(course) {
  const chapters = (course.mst_chapters || []).map((ch) => ({
    chapterId: ch.chapter_id,
    chapterCode: ch.chapter_code,
    chapterName: ch.chapter_name,
    chapterDescription: ch.chapter_description,
    chapterNumber: ch.chapter_number,
    displayOrder: ch.display_order,
    estimatedDurationMinutes: ch.estimated_duration_minutes,
    totalLessons: ch._count?.mst_lessons ?? 0,
    lessons: (ch.mst_lessons || []).map(toLessonItem),
  }));

  return {
    courseId: course.course_id,
    courseCode: course.course_code,
    courseName: course.course_name,
    courseDescription: course.course_description,
    category: course.category,
    courseIconUrl: course.course_icon_url,
    courseBannerUrl: course.course_banner_url,
    coursePreviewVideoUrl: course.course_preview_video_url,
    isFree: course.is_free,
    priceAmount: course.price_amount,
    originalPrice: course.original_price,
    currencyCode: course.currency_code,
    discountPercent: course.discount_percent,
    discountValidUntil: course.discount_valid_until_utc,
    totalChapters: course.total_chapters,
    totalLessons: course.total_lessons,
    totalVideos: course.total_videos,
    totalDocuments: course.total_documents,
    totalQuestions: course.total_questions,
    estimatedDurationHours: course.estimated_duration_hours,
    purchaseCount: course.purchase_count,
    ratingAverage: course.rating_average,
    ratingCount: course.rating_count,
    isFeatured: course.is_featured,
    status: course.status,
    publishedAt: course.published_at_utc,
    creator: course.mst_users
      ? {
        userId: course.mst_users.user_id,
        fullName: course.mst_users.full_name,
        displayName: course.mst_users.display_name,
        avatarUrl: course.mst_users.avatar_url,
      }
      : null,
    chapters,
  };
}

function toChapterItem(chapter) {
  return {
    chapterId: chapter.chapter_id,
    chapterCode: chapter.chapter_code,
    chapterName: chapter.chapter_name,
    chapterDescription: chapter.chapter_description,
    chapterNumber: chapter.chapter_number,
    displayOrder: chapter.display_order,
    estimatedDurationMinutes: chapter.estimated_duration_minutes,
    lessons: (chapter.mst_lessons || []).map(toLessonItem),
  };
}

function toLessonItem(lesson) {
  return {
    lessonId: lesson.lesson_id,
    lessonCode: lesson.lesson_code,
    lessonName: lesson.lesson_name,
    lessonDescription: lesson.lesson_description,
    lessonNumber: lesson.lesson_number,
    displayOrder: lesson.display_order,
    learningObjectives: lesson.learning_objectives,
    estimatedDurationMinutes: lesson.estimated_duration_minutes,
  };
}

function toLessonDetail(lesson) {
  return {
    lessonId: lesson.lesson_id,
    lessonCode: lesson.lesson_code,
    lessonName: lesson.lesson_name,
    lessonDescription: lesson.lesson_description,
    lessonNumber: lesson.lesson_number,
    displayOrder: lesson.display_order,
    learningObjectives: lesson.learning_objectives,
    estimatedDurationMinutes: lesson.estimated_duration_minutes,
    videos: (lesson.cnt_videos || []).map(toVideoItem),
    documents: (lesson.cnt_documents || []).map(toDocumentItem),
    questions: (lesson.cnt_questions || []).map(toQuestionItem),
  };
}

function toVideoItem(v) {
  return {
    videoId: v.video_id,
    videoTitle: v.video_title,
    videoDescription: v.video_description,
    videoUrl: v.video_url,
    videoThumbnailUrl: v.video_thumbnail_url,
    videoDurationSeconds: v.video_duration_seconds,
    videoFormat: v.video_format,
    fileSizeBytes: v.file_size_bytes ? Number(v.file_size_bytes) : null,
    status: v.status,
    createdAt: v.created_at_utc,
  };
}

function toDocumentItem(d) {
  return {
    documentId: d.document_id,
    documentTitle: d.document_title,
    documentDescription: d.document_description,
    fileName: d.file_name,
    fileUrl: d.file_url,
    fileType: d.file_type,
    fileSizeBytes: d.file_size_bytes ? Number(d.file_size_bytes) : null,
    pageCount: d.page_count,
    status: d.status,
    createdAt: d.created_at_utc,
  };
}

function toQuestionItem(q) {
  return {
    questionId: q.question_id,
    questionType: q.question_type,
    questionText: q.question_text,
    questionExplanation: q.question_explanation,
    difficultyLevel: q.difficulty_level,
    points: q.points ? Number(q.points) : 1,
    timeLimitSeconds: q.time_limit_seconds,
    status: q.status,
    createdAt: q.created_at_utc,
    options: (q.cnt_question_options || []).map((o) => ({
      optionId: o.option_id,
      optionText: o.option_text,
      optionOrder: o.option_order,
      isCorrect: o.is_correct,
      optionExplanation: o.option_explanation,
    })),
  };
}

module.exports = {
  toListItem,
  toDetail,
  toChapterItem,
  toLessonItem,
  toLessonDetail,
  toVideoItem,
  toDocumentItem,
  toQuestionItem,
};
