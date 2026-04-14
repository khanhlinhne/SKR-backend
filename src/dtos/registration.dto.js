function num(d) {
  if (d === null || d === undefined) return null;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

function toListItem(p) {
  return {
    purchaseId: p.purchase_id,
    courseId: p.course_id,
    userId: p.user_id,
    orderId: p.order_id,
    purchasedAt: p.purchased_at_utc,
    purchaseType: p.purchase_type,
    purchasePrice: num(p.purchase_price),
    currencyCode: p.currency_code,
    accessStartUtc: p.access_start_utc,
    accessEndUtc: p.access_end_utc,
    isLifetimeAccess: p.is_lifetime_access,
    progressPercent: num(p.progress_percent),
    chaptersCompleted: p.chapters_completed,
    lessonsCompleted: p.lessons_completed,
    lastAccessedAtUtc: p.last_accessed_at_utc,
    completedAtUtc: p.completed_at_utc,
    certificateIssued: p.certificate_issued,
    status: p.status,
    createdAtUtc: p.created_at_utc,
    updatedAtUtc: p.updated_at_utc,
    user: p.mst_users
      ? {
          userId: p.mst_users.user_id,
          email: p.mst_users.email,
          fullName: p.mst_users.full_name,
          displayName: p.mst_users.display_name,
          phoneNumber: p.mst_users.phone_number,
        }
      : null,
    course: p.mst_courses
      ? {
          courseId: p.mst_courses.course_id,
          courseCode: p.mst_courses.course_code,
          courseName: p.mst_courses.course_name,
          priceAmount: num(p.mst_courses.price_amount),
        }
      : null,
    order: p.pmt_orders
      ? {
          orderId: p.pmt_orders.order_id,
          orderCode: p.pmt_orders.order_code,
          totalAmount: num(p.pmt_orders.total_amount),
          paymentStatus: p.pmt_orders.payment_status,
          paidAtUtc: p.pmt_orders.paid_at_utc,
        }
      : null,
  };
}

function toDetail(p) {
  const base = toListItem(p);
  return {
    ...base,
    userRating: p.user_rating,
    userReview: p.user_review,
    ratedAtUtc: p.rated_at_utc,
    certificateIssuedAtUtc: p.certificate_issued_at_utc,
    certificateUrl: p.certificate_url,
  };
}

module.exports = { toListItem, toDetail, num };
