function toListItem(pkg) {
  return {
    packageId: pkg.package_id,
    packageCode: pkg.package_code,
    packageName: pkg.package_name,
    packageDescription: pkg.package_description,
    packageIconUrl: pkg.package_icon_url,
    packageBannerUrl: pkg.package_banner_url,
    displayOrder: pkg.display_order,
    isFree: pkg.is_free,
    priceAmount: pkg.price_amount,
    originalPrice: pkg.original_price,
    currencyCode: pkg.currency_code,
    discountPercent: pkg.discount_percent,
    discountValidUntil: pkg.discount_valid_until_utc,
    totalCourses: pkg.total_courses,
    purchaseCount: pkg.purchase_count,
    isFeatured: pkg.is_featured,
    status: pkg.status,
    publishedAt: pkg.published_at_utc,
    actualCourseCount: pkg._count?.mst_package_courses ?? pkg.total_courses,
  };
}

function toDetail(pkg) {
  const courses = (pkg.mst_package_courses || []).map((pc) => ({
    packageCourseId: pc.package_course_id,
    displayOrder: pc.display_order,
    addedAt: pc.created_at_utc,
    course: pc.mst_subjects
      ? {
          subjectId: pc.mst_subjects.subject_id,
          subjectCode: pc.mst_subjects.subject_code,
          subjectName: pc.mst_subjects.subject_name,
          subjectIconUrl: pc.mst_subjects.subject_icon_url,
          isFree: pc.mst_subjects.is_free,
          priceAmount: pc.mst_subjects.price_amount,
          totalChapters: pc.mst_subjects.total_chapters,
          totalLessons: pc.mst_subjects.total_lessons,
          ratingAverage: pc.mst_subjects.rating_average,
          status: pc.mst_subjects.status,
        }
      : null,
  }));

  return {
    packageId: pkg.package_id,
    packageCode: pkg.package_code,
    packageName: pkg.package_name,
    packageDescription: pkg.package_description,
    packageIconUrl: pkg.package_icon_url,
    packageBannerUrl: pkg.package_banner_url,
    displayOrder: pkg.display_order,
    isFree: pkg.is_free,
    priceAmount: pkg.price_amount,
    originalPrice: pkg.original_price,
    currencyCode: pkg.currency_code,
    discountPercent: pkg.discount_percent,
    discountValidUntil: pkg.discount_valid_until_utc,
    totalCourses: pkg.total_courses,
    purchaseCount: pkg.purchase_count,
    isFeatured: pkg.is_featured,
    status: pkg.status,
    publishedAt: pkg.published_at_utc,
    isActive: pkg.is_active,
    createdAt: pkg.created_at_utc,
    updatedAt: pkg.updated_at_utc,
    courses,
  };
}

module.exports = { toListItem, toDetail };
