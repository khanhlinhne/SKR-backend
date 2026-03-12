function toListItem(course) {
  return {
    courseId: course.course_id,
    courseCode: course.course_code,
    courseName: course.course_name,
    courseDescription: course.course_description,
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

module.exports = { toListItem, toDetail, toChapterItem, toLessonItem };
