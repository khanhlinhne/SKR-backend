function toListItem(subject) {
  return {
    subjectId: subject.subject_id,
    subjectCode: subject.subject_code,
    subjectName: subject.subject_name,
    subjectDescription: subject.subject_description,
    subjectIconUrl: subject.subject_icon_url,
    subjectBannerUrl: subject.subject_banner_url,
    displayOrder: subject.display_order,
    isFree: subject.is_free,
    priceAmount: subject.price_amount,
    originalPrice: subject.original_price,
    currencyCode: subject.currency_code,
    discountPercent: subject.discount_percent,
    discountValidUntil: subject.discount_valid_until_utc,
    totalChapters: subject.total_chapters,
    totalLessons: subject.total_lessons,
    estimatedDurationHours: subject.estimated_duration_hours,
    purchaseCount: subject.purchase_count,
    ratingAverage: subject.rating_average,
    ratingCount: subject.rating_count,
    isFeatured: subject.is_featured,
    status: subject.status,
    publishedAt: subject.published_at_utc,
    creator: subject.mst_users
      ? {
          userId: subject.mst_users.user_id,
          fullName: subject.mst_users.full_name,
          displayName: subject.mst_users.display_name,
          avatarUrl: subject.mst_users.avatar_url,
        }
      : null,
  };
}

function toDetail(subject) {
  const chapters = (subject.mst_chapters || []).map((ch) => ({
    chapterId: ch.chapter_id,
    chapterCode: ch.chapter_code,
    chapterName: ch.chapter_name,
    chapterNumber: ch.chapter_number,
    displayOrder: ch.display_order,
    estimatedDurationMinutes: ch.estimated_duration_minutes,
    totalLessons: ch._count?.mst_lessons ?? 0,
    lessons: (ch.mst_lessons || []).map((ls) => ({
      lessonId: ls.lesson_id,
      lessonName: ls.lesson_name,
      lessonNumber: ls.lesson_number,
      displayOrder: ls.display_order,
      estimatedDurationMinutes: ls.estimated_duration_minutes,
    })),
  }));

  return {
    subjectId: subject.subject_id,
    subjectCode: subject.subject_code,
    subjectName: subject.subject_name,
    subjectDescription: subject.subject_description,
    subjectIconUrl: subject.subject_icon_url,
    subjectBannerUrl: subject.subject_banner_url,
    subjectPreviewVideoUrl: subject.subject_preview_video_url,
    isFree: subject.is_free,
    priceAmount: subject.price_amount,
    originalPrice: subject.original_price,
    currencyCode: subject.currency_code,
    discountPercent: subject.discount_percent,
    discountValidUntil: subject.discount_valid_until_utc,
    totalChapters: subject.total_chapters,
    totalLessons: subject.total_lessons,
    totalVideos: subject.total_videos,
    totalDocuments: subject.total_documents,
    totalQuestions: subject.total_questions,
    estimatedDurationHours: subject.estimated_duration_hours,
    purchaseCount: subject.purchase_count,
    ratingAverage: subject.rating_average,
    ratingCount: subject.rating_count,
    isFeatured: subject.is_featured,
    status: subject.status,
    publishedAt: subject.published_at_utc,
    creator: subject.mst_users
      ? {
          userId: subject.mst_users.user_id,
          fullName: subject.mst_users.full_name,
          displayName: subject.mst_users.display_name,
          avatarUrl: subject.mst_users.avatar_url,
        }
      : null,
    chapters,
  };
}

module.exports = { toListItem, toDetail };
