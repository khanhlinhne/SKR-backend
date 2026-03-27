const enrollmentRepository = require("../repositories/enrollment.repository");

function toEnrollmentItem(purchase) {
  const course = purchase.mst_courses;
  const creator = course?.mst_users;
  const totalChapters = course?.mst_chapters?.length ?? course?.total_chapters ?? 0;

  return {
    enrollmentId: purchase.purchase_id,
    courseId: purchase.course_id,
    courseName: course?.course_name,
    courseDescription: course?.course_description,
    bannerUrl: course?.course_banner_url,
    iconUrl: course?.course_icon_url,
    category: course?.category,
    instructorName: creator?.display_name || creator?.full_name || null,
    instructorAvatar: creator?.avatar_url || null,
    progressPercent: Number(purchase.progress_percent || 0),
    completedLessons: purchase.lessons_completed || 0,
    completedChapters: purchase.chapters_completed || 0,
    totalLessons: course?.total_lessons || 0,
    totalChapters,
    totalVideos: course?.total_videos || 0,
    totalDocuments: course?.total_documents || 0,
    estimatedDurationHours: course?.estimated_duration_hours || 0,
    ratingAverage: course?.rating_average ? Number(course.rating_average) : 0,
    ratingCount: course?.rating_count || 0,
    isFree: course?.is_free,
    priceAmount: course?.price_amount ? Number(course.price_amount) : 0,
    purchasePrice: purchase.purchase_price ? Number(purchase.purchase_price) : 0,
    purchaseType: purchase.purchase_type,
    purchasedAt: purchase.purchased_at_utc,
    lastAccessedAt: purchase.last_accessed_at_utc,
    completedAt: purchase.completed_at_utc,
    certificateIssued: purchase.certificate_issued,
    certificateUrl: purchase.certificate_url,
    userRating: purchase.user_rating,
    userReview: purchase.user_review,
    status: purchase.status,
  };
}

const enrollmentService = {
  async getMyEnrollments(userId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const { items, totalItems } = await enrollmentRepository.findByUser(userId, {
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(toEnrollmentItem),
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

  async getMyStats(userId) {
    return enrollmentRepository.getStats(userId);
  },
};

module.exports = enrollmentService;
