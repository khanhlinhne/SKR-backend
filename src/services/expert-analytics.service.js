const AppError = require("../utils/AppError");
const analyticsRepository = require("../repositories/expert-analytics.repository");

const DEFAULT_TIMEZONE = "Asia/Bangkok";
const DEFAULT_TIMEZONE_OFFSET = 7;
const MS_PER_DAY = 86_400_000;
const WEEKDAY_LABELS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const FUNNEL_STEPS = [
  { label: "Đăng ký", threshold: null, colorToken: "violet" },
  { label: "Bắt đầu học", threshold: 0.00001, colorToken: "blue" },
  { label: "Hoàn thành 50%", threshold: 50, colorToken: "cyan" },
  { label: "Hoàn thành 75%", threshold: 75, colorToken: "amber" },
  { label: "Hoàn thành 100%", threshold: 100, colorToken: "emerald" },
];

function num(value) {
  if (value === null || value === undefined) return 0;
  return typeof value === "object" && typeof value.toNumber === "function" ? value.toNumber() : Number(value);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function clampProgress(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function pctChange(current, previous) {
  const currentValue = Number(current);
  const previousValue = Number(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return round1(((currentValue - previousValue) / previousValue) * 100);
}

function compactNumber(value) {
  const normalized = Number(value) || 0;
  const abs = Math.abs(normalized);

  if (abs >= 1_000_000_000) {
    const scaled = abs / 1_000_000_000;
    return `${normalized < 0 ? "-" : ""}${scaled.toFixed(scaled >= 10 ? 0 : 1).replace(/\.0$/, "")}B`;
  }

  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    return `${normalized < 0 ? "-" : ""}${scaled.toFixed(scaled >= 10 ? 0 : 1).replace(/\.0$/, "")}M`;
  }

  if (abs >= 1_000) {
    return `${normalized < 0 ? "-" : ""}${Math.round(abs).toLocaleString("en-US")}`;
  }

  return `${Math.round(normalized)}`;
}

function formatInteger(value) {
  return Math.round(Number(value) || 0).toLocaleString("en-US");
}

function formatCurrencyVnd(value) {
  return `₫${formatInteger(value)}`;
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function mapOrderStatus(paymentStatus) {
  const code = typeof paymentStatus === "string" ? paymentStatus.trim().toLowerCase() : "pending";
  const map = {
    completed: { label: "Hoàn thành", tone: "success" },
    processing: { label: "Đang xử lý", tone: "warning" },
    pending: { label: "Chờ thanh toán", tone: "neutral" },
    failed: { label: "Thất bại", tone: "danger" },
    cancelled: { label: "Đã hủy", tone: "danger" },
    refunded: { label: "Hoàn tiền", tone: "info" },
  };

  return {
    code,
    label: map[code]?.label || titleCaseWords(code),
    tone: map[code]?.tone || "neutral",
  };
}

function formatRelativeTimeVi(dateInput) {
  if (!dateInput) return null;

  const ts = new Date(dateInput).getTime();
  if (Number.isNaN(ts)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));

  if (seconds < 60) return "Vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} ngày trước`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} tháng trước`;
  return `${Math.floor(seconds / 31536000)} năm trước`;
}

function parseTimezoneOffsetFromIntlLabel(label) {
  if (!label) return null;
  if (label === "GMT" || label === "UTC") return 0;

  const match = label.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]) || 0;
  const minutes = Number(match[3] || 0);
  return sign * (hours + minutes / 60);
}

function getTimezoneOffsetHours(timezone, referenceDate = new Date()) {
  if (!timezone) return DEFAULT_TIMEZONE_OFFSET;
  if (timezone === "Asia/Bangkok") return 7;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      year: "numeric",
    });
    const part = formatter
      .formatToParts(referenceDate)
      .find((item) => item.type === "timeZoneName");
    return parseTimezoneOffsetFromIntlLabel(part?.value) ?? DEFAULT_TIMEZONE_OFFSET;
  } catch (_error) {
    return DEFAULT_TIMEZONE_OFFSET;
  }
}

function resolveTimezone(query = {}, referenceDate = new Date()) {
  const timezone =
    typeof query.timezone === "string" && query.timezone.trim()
      ? query.timezone.trim()
      : DEFAULT_TIMEZONE;

  return {
    timezone,
    timezoneOffset: getTimezoneOffsetHours(timezone, referenceDate),
  };
}

function shiftToLocal(dateInput, timezoneOffset) {
  const date = new Date(dateInput);
  return new Date(date.getTime() + timezoneOffset * 3_600_000);
}

function startOfLocalDayUtc(referenceDate, timezoneOffset) {
  const local = shiftToLocal(referenceDate, timezoneOffset);
  const localStartMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localStartMs - timezoneOffset * 3_600_000);
}

function startOfLocalWeekUtc(referenceDate, timezoneOffset) {
  const local = shiftToLocal(referenceDate, timezoneOffset);
  const weekday = (local.getUTCDay() + 6) % 7;
  const localStartMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekday);
  return new Date(localStartMs - timezoneOffset * 3_600_000);
}

function startOfLocalMonthUtc(referenceDate, timezoneOffset) {
  const local = shiftToLocal(referenceDate, timezoneOffset);
  const localStartMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  return new Date(localStartMs - timezoneOffset * 3_600_000);
}

function addMs(dateInput, amount) {
  return new Date(new Date(dateInput).getTime() + amount);
}

function addDaysUtc(dateInput, days) {
  return addMs(dateInput, days * MS_PER_DAY);
}

function getMonthRangeInfo(startUtc, endExclusiveUtc) {
  const buckets = [];
  let cursor = new Date(startUtc);
  let index = 1;

  while (cursor < endExclusiveUtc) {
    const next = new Date(Math.min(addDaysUtc(cursor, 7).getTime(), endExclusiveUtc.getTime()));
    buckets.push({
      label: `Tuần ${index}`,
      startUtc: cursor,
      endExclusiveUtc: next,
      endDisplayUtc: addMs(next, -1),
      value: 0,
    });
    cursor = next;
    index += 1;
  }

  return buckets;
}

function buildChartBuckets(chartPeriod, startUtc, endExclusiveUtc, timezoneOffset) {
  if (chartPeriod === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const bucketStartUtc = addDaysUtc(startUtc, index);
      const bucketEndExclusiveUtc = addDaysUtc(bucketStartUtc, 1);
      return {
        label: WEEKDAY_LABELS_VI[index],
        startUtc: bucketStartUtc,
        endExclusiveUtc: bucketEndExclusiveUtc,
        endDisplayUtc: addMs(bucketEndExclusiveUtc, -1),
        value: 0,
      };
    });
  }

  return getMonthRangeInfo(startUtc, endExclusiveUtc);
}

function buildCurrentWeekBuckets(referenceDate, timezoneOffset) {
  const startUtc = startOfLocalWeekUtc(referenceDate, timezoneOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const bucketStartUtc = addDaysUtc(startUtc, index);
    const bucketEndExclusiveUtc = addDaysUtc(bucketStartUtc, 1);
    return {
      label: WEEKDAY_LABELS_VI[index],
      startUtc: bucketStartUtc,
      endExclusiveUtc: bucketEndExclusiveUtc,
      endDisplayUtc: addMs(bucketEndExclusiveUtc, -1),
      value: 0,
      users: new Set(),
    };
  });
}

function startOfNextLocalMonthUtc(referenceDate, timezoneOffset) {
  const local = shiftToLocal(referenceDate, timezoneOffset);
  const localStartMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1);
  return new Date(localStartMs - timezoneOffset * 3_600_000);
}

function isWithinRange(dateInput, fromUtc, toExclusiveUtc) {
  if (!dateInput) return false;
  const timestamp = new Date(dateInput).getTime();
  return timestamp >= fromUtc.getTime() && timestamp < toExclusiveUtc.getTime();
}

function resolveDateRange(query, chartPeriod, timezoneOffset, now = new Date()) {
  const fromInput = query.from ? new Date(query.from) : null;
  const toInput = query.to ? new Date(query.to) : null;

  if ((fromInput && Number.isNaN(fromInput.getTime())) || (toInput && Number.isNaN(toInput.getTime()))) {
    throw AppError.badRequest("from and to must be valid ISO 8601 datetime strings");
  }

  if ((fromInput && !toInput) || (!fromInput && toInput)) {
    throw AppError.badRequest("from and to must be provided together");
  }

  let fromUtc;
  let toDisplayUtc;

  if (fromInput && toInput) {
    if (fromInput.getTime() > toInput.getTime()) {
      throw AppError.badRequest("from must be earlier than or equal to to");
    }
    fromUtc = fromInput;
    toDisplayUtc = toInput;
  } else if (chartPeriod === "month") {
    fromUtc = startOfLocalMonthUtc(now, timezoneOffset);
    toDisplayUtc = addMs(startOfNextLocalMonthUtc(now, timezoneOffset), -1);
  } else {
    fromUtc = startOfLocalWeekUtc(now, timezoneOffset);
    toDisplayUtc = addMs(addDaysUtc(fromUtc, 7), -1);
  }

  const toExclusiveUtc = addMs(toDisplayUtc, 1);
  const durationMs = Math.max(toExclusiveUtc.getTime() - fromUtc.getTime(), 1);
  const previousFromUtc = new Date(fromUtc.getTime() - durationMs);
  const previousToExclusiveUtc = new Date(fromUtc.getTime());
  const previousToDisplayUtc = addMs(previousToExclusiveUtc, -1);

  return {
    fromUtc,
    toDisplayUtc,
    toExclusiveUtc,
    previousFromUtc,
    previousToDisplayUtc,
    previousToExclusiveUtc,
  };
}

function deriveEnrollmentStatus(purchase, now = new Date()) {
  const rawStatus = String(purchase.status || "").trim().toLowerCase();
  const progress = clampProgress(purchase.progress_percent);
  const completed = progress >= 100 || Boolean(purchase.completed_at_utc);
  const accessEndAt = purchase.access_end_utc ? new Date(purchase.access_end_utc) : null;
  const expired =
    accessEndAt &&
    !Number.isNaN(accessEndAt.getTime()) &&
    accessEndAt.getTime() < now.getTime() &&
    !completed;

  if (rawStatus === "pending") return "pending";
  if (rawStatus === "expired" || rawStatus === "cancelled" || rawStatus === "refunded" || expired) {
    return "expired";
  }
  if (rawStatus === "completed" || completed) return "completed";
  return "active";
}

function isSuccessfulRevenue(purchase) {
  const paymentStatus = String(purchase.pmt_orders?.payment_status || "").toLowerCase();
  const cancelledAt = purchase.pmt_orders?.cancelled_at_utc;
  const refundedAt = purchase.pmt_orders?.refunded_at_utc;
  return paymentStatus === "completed" && !cancelledAt && !refundedAt;
}

function getRevenueAmount(purchase) {
  return num(purchase.purchase_price) || num(purchase.pmt_orders?.total_amount) || 0;
}

function normalizeEnrollments(enrollmentsRaw, now = new Date()) {
  return enrollmentsRaw.map((purchase) => ({
    ...purchase,
    derivedStatus: deriveEnrollmentStatus(purchase, now),
    progress: clampProgress(purchase.progress_percent),
    revenueAmount: getRevenueAmount(purchase),
    isSuccessfulRevenue: isSuccessfulRevenue(purchase),
  }));
}

function countDistinctUsers(rows) {
  return new Set(rows.map((row) => row.userId).filter(Boolean)).size;
}

function buildLessonOrder(course) {
  const orderedLessons = [];
  for (const chapter of course.mst_chapters || []) {
    for (const lesson of chapter.mst_lessons || []) {
      orderedLessons.push({
        chapterId: chapter.chapter_id,
        chapterName: chapter.chapter_name,
        lessonId: lesson.lesson_id,
        lessonName: lesson.lesson_name,
        order: orderedLessons.length + 1,
      });
    }
  }
  return orderedLessons;
}

function buildLessonProgress(course, enrollments, lessonProgressRows) {
  const orderedLessons = buildLessonOrder(course);
  const totalEnrollments = enrollments.length;
  const orderByLessonId = new Map(orderedLessons.map((lesson) => [lesson.lessonId, lesson.order]));
  const highestReachedOrderByUser = new Map();

  for (const row of lessonProgressRows) {
    const lessonOrder = orderByLessonId.get(row.lesson_id);
    if (!lessonOrder) continue;

    const currentMax = highestReachedOrderByUser.get(row.user_id) || 0;
    if (lessonOrder > currentMax) {
      highestReachedOrderByUser.set(row.user_id, lessonOrder);
    }
  }

  return orderedLessons.map((lesson, index) => {
    const currentStep = index + 1;
    const studentsAtLesson = [...highestReachedOrderByUser.values()].filter((order) => order >= currentStep).length;
    const nextStepUsers =
      index + 1 < orderedLessons.length
        ? [...highestReachedOrderByUser.values()].filter((order) => order >= currentStep + 1).length
        : null;

    return {
      lessonId: lesson.lessonId,
      lessonName: lesson.lessonName,
      studentsAtLesson,
      completionRate: totalEnrollments > 0 ? round1((studentsAtLesson / totalEnrollments) * 100) : 0,
      dropRate:
        nextStepUsers === null || studentsAtLesson === 0
          ? null
          : round1((1 - nextStepUsers / studentsAtLesson) * 100),
    };
  });
}

function buildCompletionFunnel(enrollments) {
  const total = enrollments.length;
  return FUNNEL_STEPS.map((step) => {
    let count;
    if (step.threshold === null) {
      count = total;
    } else {
      count = enrollments.filter((purchase) => purchase.progress >= step.threshold).length;
    }

    return {
      label: step.label,
      count,
      pct: total > 0 ? round1((count / total) * 100) : 0,
      colorToken: step.colorToken,
    };
  });
}

function buildRatingBreakdown(enrollments) {
  const counts = new Map(
    [5, 4, 3, 2, 1].map((stars) => [
      stars,
      {
        stars,
        pct: 0,
        count: 0,
      },
    ])
  );
  let totalRatings = 0;

  for (const purchase of enrollments) {
    const rating = Number(purchase.user_rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    counts.get(rating).count += 1;
    totalRatings += 1;
  }

  return [5, 4, 3, 2, 1].map((stars) => {
    const item = counts.get(stars);
    return {
      stars,
      count: item.count,
      pct: totalRatings > 0 ? round1((item.count / totalRatings) * 100) : 0,
    };
  });
}

function bucketizeCount(items, buckets, getTimestamp) {
  for (const item of items) {
    const timestamp = getTimestamp(item);
    if (!timestamp) continue;

    const bucket = buckets.find((entry) => isWithinRange(timestamp, entry.startUtc, entry.endExclusiveUtc));
    if (bucket) {
      bucket.value += 1;
    }
  }
}

function bucketizeSum(items, buckets, getTimestamp, getValue) {
  for (const item of items) {
    const timestamp = getTimestamp(item);
    if (!timestamp) continue;

    const bucket = buckets.find((entry) => isWithinRange(timestamp, entry.startUtc, entry.endExclusiveUtc));
    if (bucket) {
      bucket.value += Number(getValue(item)) || 0;
    }
  }
}

function buildActivityEvents(lessonProgressRows, videoProgressRows) {
  const lessonEvents = lessonProgressRows.flatMap((row) => {
    const events = [];
    if (row.created_at_utc) {
      events.push({
        userId: row.user_id,
        timestamp: row.created_at_utc,
        kind: "lesson",
      });
    }
    if (row.updated_at_utc && String(row.updated_at_utc) !== String(row.created_at_utc)) {
      events.push({
        userId: row.user_id,
        timestamp: row.updated_at_utc,
        kind: "lesson",
      });
    }
    return events;
  });

  const videoEvents = videoProgressRows.map((row) => ({
    userId: row.userId,
    timestamp: row.lastWatchedAtUtc || row.updatedAtUtc || row.createdAtUtc,
    kind: "video",
    watchDurationSeconds: Number(row.watchDurationSeconds) || 0,
  }));

  return {
    lessonEvents: lessonEvents.filter((event) => event.timestamp),
    videoEvents: videoEvents.filter((event) => event.timestamp),
  };
}

function buildWeeklyActivityChart(activityEvents, referenceDate, timezoneOffset) {
  const buckets = buildCurrentWeekBuckets(referenceDate, timezoneOffset);
  for (const event of activityEvents) {
    const bucket = buckets.find((entry) => isWithinRange(event.timestamp, entry.startUtc, entry.endExclusiveUtc));
    if (bucket && event.userId) {
      bucket.users.add(event.userId);
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: bucket.users.size,
  }));
}

function computeAverageStudyMinutes(videoEvents) {
  if (!videoEvents.length) return null;
  const activeLearners = countDistinctUsers(videoEvents);
  if (activeLearners === 0) return null;
  const totalSeconds = videoEvents.reduce((sum, event) => sum + (event.watchDurationSeconds || 0), 0);
  return round1(totalSeconds / 60 / activeLearners);
}

function computeAverageRating(enrollments) {
  const ratings = enrollments
    .map((purchase) => Number(purchase.user_rating))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);

  return {
    value: ratings.length ? round1(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : null,
    ratingCount: ratings.length,
  };
}

function computeHistoricalAverageRating(enrollments, cutoffUtc) {
  const ratings = enrollments
    .filter((purchase) => purchase.rated_at_utc && new Date(purchase.rated_at_utc).getTime() < cutoffUtc.getTime())
    .map((purchase) => Number(purchase.user_rating))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);

  if (!ratings.length) return null;
  return round1(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
}

function computeCompletionRate(enrollments) {
  const started = enrollments.filter((purchase) => purchase.progress > 0).length;
  if (started === 0) return 0;
  const completed = enrollments.filter((purchase) => purchase.progress >= 100).length;
  return round1((completed / started) * 100);
}

function getOrderTimestamp(purchase) {
  return purchase.pmt_orders?.created_at_utc || purchase.purchased_at_utc || null;
}

function getPaymentTimestamp(purchase) {
  return purchase.pmt_orders?.paid_at_utc || purchase.purchased_at_utc || null;
}

function isOrderCompleted(purchase) {
  return String(purchase.pmt_orders?.payment_status || "").toLowerCase() === "completed";
}

function buildOrderStats(enrollments) {
  const orders = enrollments.filter((purchase) => purchase.order_id);
  const completedOrders = orders.filter((purchase) => isOrderCompleted(purchase) && purchase.isSuccessfulRevenue);
  const totalOrders = orders.length;
  const completedCount = completedOrders.length;

  return {
    totalOrders,
    completedOrders: completedCount,
    pendingOrders: orders.filter((purchase) => String(purchase.pmt_orders?.payment_status || "").toLowerCase() === "pending").length,
    failedOrders: orders.filter((purchase) =>
      ["failed", "cancelled", "refunded"].includes(String(purchase.pmt_orders?.payment_status || "").toLowerCase())
    ).length,
    value: totalOrders > 0 ? round1((completedCount / totalOrders) * 100) : 0,
  };
}

function toOrderAnalyticsItem(purchase, course) {
  const order = purchase.pmt_orders || {};
  const status = mapOrderStatus(order.payment_status);
  const learner = purchase.mst_users || {};
  const amount = Math.round(purchase.revenueAmount);
  const createdAt = getOrderTimestamp(purchase);
  const paidAt = getPaymentTimestamp(purchase);
  const completedAt = isOrderCompleted(purchase) ? paidAt || createdAt : null;

  return {
    id: order.order_code || purchase.order_id || purchase.purchase_id,
    orderId: order.order_id || purchase.order_id,
    orderCode: order.order_code || null,
    displayCode: order.order_code ? `#${order.order_code}` : `#${String(purchase.order_id || purchase.purchase_id).slice(0, 8)}`,
    status: status.code,
    paymentStatus: status.code,
    paymentStatusLabel: status.label,
    paymentStatusTone: status.tone,
    paymentMethod: "unknown",
    amount,
    courseAmount: amount,
    finalAmount: amount,
    paidAmount: amount,
    revenue: amount,
    amountDisplay: formatCurrencyVnd(amount),
    currencyCode: purchase.currency_code || order.currency_code || "VND",
    completedAt,
    paidAt,
    paymentDate: paidAt,
    purchasedAt: purchase.purchased_at_utc || null,
    orderDate: createdAt,
    createdAt,
    createdAtUtc: createdAt,
    paidAtUtc: paidAt,
    completedAtUtc: completedAt,
    customerName: order.customer_name || learner.full_name || learner.display_name || learner.email || null,
    studentName: learner.full_name || learner.display_name || learner.email || null,
    fullName: learner.full_name || learner.display_name || learner.email || null,
    email: learner.email || order.customer_email || null,
    customerEmail: order.customer_email || learner.email || null,
    customerPhone: order.customer_phone || learner.phone_number || null,
    mobile: learner.phone_number || order.customer_phone || null,
    customerAvatarUrl: learner.avatar_url || null,
    avatarUrl: learner.avatar_url || null,
    courseOrItemName: course.course_name || null,
    courseName: course.course_name || null,
    courseId: course.course_id,
    courseCode: course.course_code || null,
    itemType: order.order_type || purchase.purchase_type || "course_purchase",
    createdRelative: formatRelativeTimeVi(createdAt),
  };
}

function buildRecentOrdersBlock(enrollments, course, { fromUtc, toExclusiveUtc } = {}) {
  const orders = enrollments
    .filter((purchase) => purchase.order_id)
    .filter((purchase) => {
      if (!fromUtc || !toExclusiveUtc) return true;
      return isWithinRange(getOrderTimestamp(purchase), fromUtc, toExclusiveUtc);
    })
    .sort((left, right) => new Date(getOrderTimestamp(right) || 0).getTime() - new Date(getOrderTimestamp(left) || 0).getTime());
  const allItems = orders.map((purchase) => toOrderAnalyticsItem(purchase, course));
  const items = allItems.slice(0, 10);

  return {
    title: "Đơn hàng gần đây",
    actionLabel: "Xem tất cả",
    columns: [
      { key: "order", label: "Mã đơn" },
      { key: "course", label: "Khóa học" },
      { key: "amount", label: "Số tiền" },
      { key: "status", label: "Trạng thái" },
    ],
    total: orders.length,
    totalDisplay: String(orders.length),
    itemsAll: allItems,
    items,
  };
}

function buildCourseOverview(course) {
  const totalChapters = course.total_chapters || 0;
  const totalLessons = course.total_lessons || 0;
  const totalVideos = course.total_videos || 0;
  const totalDocuments = course.total_documents || 0;
  const totalQuestions = course.total_questions || 0;
  const estimatedDurationHours = Number(course.estimated_duration_hours || 0);

  return {
    courseId: course.course_id,
    courseCode: course.course_code || null,
    courseName: course.course_name || null,
    category: course.category || null,
    totalChapters,
    totalLessons,
    totalVideos,
    totalDocuments,
    totalQuestions,
    chapterLessonText: `${totalChapters} chương • ${totalLessons} bài`,
    estimatedDurationHours,
    estimatedDurationDisplay: `${round1(estimatedDurationHours)} giờ`,
    status: course.status || null,
    publishedAtUtc: course.published_at_utc || null,
    fields: [
      { key: "courseCode", label: "Mã khóa", value: course.course_code || "—" },
      { key: "category", label: "Danh mục", value: course.category || "—" },
      { key: "chapterLesson", label: "Chương / Bài", value: `${totalChapters} chương • ${totalLessons} bài` },
      { key: "estimatedDuration", label: "Thời lượng", value: `${round1(estimatedDurationHours)} giờ` },
      { key: "videos", label: "Video", value: totalVideos },
      { key: "documents", label: "Tài liệu", value: totalDocuments },
      { key: "questions", label: "Câu hỏi", value: totalQuestions },
      { key: "published", label: "Xuất bản", value: course.status === "published" ? "Đã xuất bản" : "—" },
    ],
  };
}

function buildExpertBlock(course) {
  const expert = course.mst_users || null;

  return {
    expertId: course.creator_id || null,
    fullName: expert?.full_name || expert?.display_name || expert?.email || null,
    displayName: expert?.display_name || expert?.full_name || null,
    email: expert?.email || null,
    avatarUrl: expert?.avatar_url || null,
    user: expert
      ? {
          userId: expert.user_id,
          fullName: expert.full_name,
          displayName: expert.display_name,
          email: expert.email,
          avatarUrl: expert.avatar_url,
        }
      : null,
  };
}

function computeSummaryStats(filteredEnrollments) {
  const successfulRevenue = filteredEnrollments
    .filter((purchase) => purchase.isSuccessfulRevenue)
    .reduce((sum, purchase) => sum + purchase.revenueAmount, 0);

  return {
    totalEnrollments: filteredEnrollments.length,
    activeCount: filteredEnrollments.filter((purchase) => purchase.derivedStatus === "active").length,
    completedCount: filteredEnrollments.filter((purchase) => purchase.derivedStatus === "completed").length,
    expiredCount: filteredEnrollments.filter((purchase) => purchase.derivedStatus === "expired").length,
    pendingCount: filteredEnrollments.filter((purchase) => purchase.derivedStatus === "pending").length,
    grossRevenue: Math.round(successfulRevenue),
  };
}

function sortEnrollments(items, sortField, sortDirection) {
  const direction = sortDirection === "asc" ? 1 : -1;
  const field = sortField || "date";

  const resolveValue = (item) => {
    switch (field) {
      case "name":
      case "learnerName":
        return item.fullName || item.email || "";
      case "cost":
      case "paidAmount":
        return item.cost;
      case "id":
        return item.id;
      case "date":
      case "enrolledDate":
      default:
        return item.date ? new Date(item.date).getTime() : 0;
    }
  };

  return [...items].sort((left, right) => {
    const leftValue = resolveValue(left);
    const rightValue = resolveValue(right);

    if (typeof leftValue === "string" || typeof rightValue === "string") {
      return String(leftValue).localeCompare(String(rightValue)) * direction;
    }

    if (leftValue === rightValue) return 0;
    return leftValue > rightValue ? direction : -direction;
  });
}

function paginate(items, page, limit) {
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * limit;

  return {
    items: items.slice(offset, offset + limit),
    pagination: {
      page: safePage,
      limit,
      totalItems,
      totalPages,
    },
  };
}

function toEnrollmentListItem(purchase) {
  const learner = purchase.mst_users || {};
  return {
    id: purchase.purchase_id,
    learnerId: purchase.user_id,
    fullName: learner.full_name || learner.display_name || learner.email || null,
    email: learner.email || null,
    mobile: learner.phone_number || null,
    avatarUrl: learner.avatar_url || null,
    date: purchase.purchased_at_utc,
    cost: Math.round(purchase.revenueAmount),
    status: purchase.derivedStatus,
    progress: purchase.progress,
  };
}

function toCsv(items) {
  const header = [
    "Enrollment ID",
    "Learner Name",
    "Email",
    "Phone",
    "Enrolled Date",
    "Paid Amount",
    "Progress",
    "Status",
  ];

  const escapeCsv = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = items.map((item) => [
    item.id,
    item.fullName || "",
    item.email || "",
    item.mobile || "",
    item.date || "",
    item.cost ?? 0,
    item.progress ?? 0,
    item.status,
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function formatDateTimeWithOffset(dateInput, timezoneOffset) {
  if (!dateInput) return "";
  const shifted = shiftToLocal(dateInput, timezoneOffset);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const date = String(shifted.getUTCDate()).padStart(2, "0");
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  const seconds = String(shifted.getUTCSeconds()).padStart(2, "0");
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const absolute = Math.abs(timezoneOffset);
  const offsetHours = String(Math.floor(absolute)).padStart(2, "0");
  const offsetMinutes = String(Math.round((absolute % 1) * 60)).padStart(2, "0");
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

async function loadCourseAnalyticsContext(courseId, userId, roles = [], now = new Date()) {
  const isAdmin = Array.isArray(roles) && roles.includes("admin");
  const course = await analyticsRepository.findOwnedCourse(courseId, userId, { isAdmin });
  if (!course) throw AppError.notFound("Course not found");

  const [enrollmentsRaw, lessonProgressRows, videoProgressRows] = await Promise.all([
    analyticsRepository.findEnrollmentsByCourse(courseId),
    analyticsRepository.findLessonProgressByCourse(courseId),
    analyticsRepository.findVideoProgressByCourse(courseId),
  ]);

  return {
    course,
    enrollments: normalizeEnrollments(enrollmentsRaw, now),
    lessonProgressRows,
    videoProgressRows,
  };
}

function filterEnrollmentItems(enrollments, query = {}) {
  const normalizedStatus = query.status && query.status !== "all" ? String(query.status).trim().toLowerCase() : null;
  const search = typeof query.search === "string" ? query.search.trim().toLowerCase() : "";

  return enrollments.filter((purchase) => {
    if (normalizedStatus && purchase.derivedStatus !== normalizedStatus) {
      return false;
    }

    if (!search) return true;

    const haystack = [
      purchase.purchase_id,
      purchase.user_id,
      purchase.mst_users?.full_name,
      purchase.mst_users?.display_name,
      purchase.mst_users?.email,
      purchase.mst_users?.phone_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

const expertAnalyticsService = {
  async getCourseAnalyticsOverview(courseId, userId, query = {}, roles = []) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const now = new Date();
    const chartPeriod = query.chartPeriod === "month" ? "month" : "week";
    const { timezone, timezoneOffset } = resolveTimezone(query, now);
    const range = resolveDateRange(query, chartPeriod, timezoneOffset, now);

    const { course, enrollments, lessonProgressRows, videoProgressRows } = await loadCourseAnalyticsContext(
      courseId,
      userId,
      roles,
      now
    );

    const { lessonEvents, videoEvents } = buildActivityEvents(lessonProgressRows, videoProgressRows);

    const currentEnrollments = enrollments.filter((purchase) =>
      isWithinRange(purchase.purchased_at_utc, range.fromUtc, range.toExclusiveUtc)
    );
    const previousEnrollments = enrollments.filter((purchase) =>
      isWithinRange(purchase.purchased_at_utc, range.previousFromUtc, range.previousToExclusiveUtc)
    );
    const currentOrders = enrollments.filter((purchase) =>
      purchase.order_id && isWithinRange(getOrderTimestamp(purchase), range.fromUtc, range.toExclusiveUtc)
    );
    const previousOrders = enrollments.filter((purchase) =>
      purchase.order_id && isWithinRange(getOrderTimestamp(purchase), range.previousFromUtc, range.previousToExclusiveUtc)
    );
    const todayStartUtc = startOfLocalDayUtc(now, timezoneOffset);

    const currentRevenue = enrollments
      .filter(
        (purchase) =>
          purchase.isSuccessfulRevenue && isWithinRange(getPaymentTimestamp(purchase), range.fromUtc, range.toExclusiveUtc)
      )
      .reduce((sum, purchase) => sum + purchase.revenueAmount, 0);
    const previousRevenue = enrollments
      .filter(
        (purchase) =>
          purchase.isSuccessfulRevenue && isWithinRange(getPaymentTimestamp(purchase), range.previousFromUtc, range.previousToExclusiveUtc)
      )
      .reduce((sum, purchase) => sum + purchase.revenueAmount, 0);
    const lifetimeRevenue = enrollments
      .filter((purchase) => purchase.isSuccessfulRevenue)
      .reduce((sum, purchase) => sum + purchase.revenueAmount, 0);

    const currentLessonEvents = lessonEvents.filter((event) =>
      isWithinRange(event.timestamp, range.fromUtc, range.toExclusiveUtc)
    );
    const previousLessonEvents = lessonEvents.filter((event) =>
      isWithinRange(event.timestamp, range.previousFromUtc, range.previousToExclusiveUtc)
    );
    const currentVideoEvents = videoEvents.filter((event) =>
      isWithinRange(event.timestamp, range.fromUtc, range.toExclusiveUtc)
    );
    const previousVideoEvents = videoEvents.filter((event) =>
      isWithinRange(event.timestamp, range.previousFromUtc, range.previousToExclusiveUtc)
    );

    const currentChartBuckets = buildChartBuckets(chartPeriod, range.fromUtc, range.toExclusiveUtc, timezoneOffset);
    const currentRevenueBuckets = currentChartBuckets.map((bucket) => ({ ...bucket, value: 0 }));
    const currentEnrollmentBuckets = currentChartBuckets.map((bucket) => ({ ...bucket, value: 0 }));
    const currentLessonBuckets = currentChartBuckets.map((bucket) => ({ ...bucket, value: 0 }));

    bucketizeCount(
      currentEnrollments,
      currentEnrollmentBuckets,
      (purchase) => purchase.purchased_at_utc
    );
    bucketizeSum(
      enrollments.filter((purchase) => purchase.isSuccessfulRevenue),
      currentRevenueBuckets,
      (purchase) => getPaymentTimestamp(purchase),
      (purchase) => purchase.revenueAmount
    );
    bucketizeCount(currentLessonEvents, currentLessonBuckets, (event) => event.timestamp);

    const avgStudyTimeSparkline = currentChartBuckets.map((bucket) => {
      const bucketEvents = currentVideoEvents.filter((event) =>
        isWithinRange(event.timestamp, bucket.startUtc, bucket.endExclusiveUtc)
      );
      const average = computeAverageStudyMinutes(bucketEvents);
      return average ?? 0;
    });

    const newStudentsToday = enrollments.filter((purchase) =>
      isWithinRange(purchase.purchased_at_utc, todayStartUtc, addMs(now, 1))
    ).length;
    const currentAvgStudyTime = computeAverageStudyMinutes(currentVideoEvents);
    const previousAvgStudyTime = computeAverageStudyMinutes(previousVideoEvents);
    const currentLessonsViewed = currentLessonEvents.length;
    const previousLessonsViewed = previousLessonEvents.length;
    const ratingSummary = computeAverageRating(enrollments);
    const previousAverageRating = computeHistoricalAverageRating(enrollments, range.fromUtc);
    const learningCompletionRate = computeCompletionRate(enrollments);
    const currentOrderStats = buildOrderStats(currentOrders);
    const previousOrderStats = buildOrderStats(previousOrders);
    const recentOrders = buildRecentOrdersBlock(enrollments, course, range);
    const courseOverview = buildCourseOverview(course);
    const expert = buildExpertBlock(course);

    return {
      courseId: course.course_id,
      generatedAt: now,
      period: {
        chartPeriod,
        timezone,
        from: range.fromUtc,
        to: range.toDisplayUtc,
        previousFrom: range.previousFromUtc,
        previousTo: range.previousToDisplayUtc,
      },
      metrics: {
        totalRevenue: {
          value: Math.round(currentRevenue),
          formattedShort: compactNumber(currentRevenue),
          changePct: pctChange(currentRevenue, previousRevenue),
          totalValue: Math.round(lifetimeRevenue),
          totalFormattedShort: compactNumber(lifetimeRevenue),
        },
        newStudents: {
          value: currentEnrollments.length,
          today: newStudentsToday,
          changePct: pctChange(currentEnrollments.length, previousEnrollments.length),
        },
        completionRate: {
          value: currentOrderStats.value,
          changePct: pctChange(currentOrderStats.value, previousOrderStats.value),
          completedOrders: currentOrderStats.completedOrders,
          totalOrders: currentOrderStats.totalOrders,
          fractionDisplay: `${currentOrderStats.completedOrders}/${currentOrderStats.totalOrders} đơn`,
        },
        avgStudyTimeMinutes: {
          value: currentAvgStudyTime,
          changeMinutes:
            currentAvgStudyTime === null || previousAvgStudyTime === null
              ? null
              : round1(currentAvgStudyTime - previousAvgStudyTime),
        },
        lessonsViewed: {
          value: currentLessonsViewed,
          change: currentLessonsViewed - previousLessonsViewed,
        },
        avgRating: {
          value: ratingSummary.value,
          change:
            ratingSummary.value === null || previousAverageRating === null
              ? null
              : round1(ratingSummary.value - previousAverageRating),
          ratingCount: ratingSummary.ratingCount,
        },
        orderCompletionRate: {
          value: currentOrderStats.value,
          changePct: pctChange(currentOrderStats.value, previousOrderStats.value),
          completedOrders: currentOrderStats.completedOrders,
          totalOrders: currentOrderStats.totalOrders,
          fractionDisplay: `${currentOrderStats.completedOrders}/${currentOrderStats.totalOrders} đơn`,
        },
        learningCompletionRate: {
          value: learningCompletionRate,
          changePct: null,
        },
      },
      sparklines: {
        revenue: currentRevenueBuckets.map((bucket) => Math.round(bucket.value)),
        newStudents: currentEnrollmentBuckets.map((bucket) => bucket.value),
        avgStudyTime: avgStudyTimeSparkline,
        lessonsViewed: currentLessonBuckets.map((bucket) => bucket.value),
      },
      newEnrollmentChart: currentEnrollmentBuckets.map((bucket) => ({
        label: bucket.label,
        value: bucket.value,
      })),
      weeklyActivityChart: buildWeeklyActivityChart(
        [...lessonEvents, ...videoEvents],
        now,
        timezoneOffset
      ),
      lessonProgress: buildLessonProgress(course, enrollments, lessonProgressRows),
      completionFunnel: buildCompletionFunnel(enrollments),
      ratingBreakdown: buildRatingBreakdown(enrollments),
      recentOrders,
      recentOrderItems: {
        total: recentOrders.total,
        totalDisplay: recentOrders.totalDisplay,
        items: recentOrders.itemsAll,
      },
      revenueSeries: currentRevenueBuckets.map((bucket) => ({
        label: bucket.label,
        revenue: Math.round(bucket.value),
      })),
      enrollmentSeries: currentEnrollmentBuckets.map((bucket) => ({
        label: bucket.label,
        count: bucket.value,
      })),
      courseOverview,
      expert,
      orderCompletionRate: {
        value: currentOrderStats.value,
        changePct: pctChange(currentOrderStats.value, previousOrderStats.value),
        completedOrders: currentOrderStats.completedOrders,
        totalOrders: currentOrderStats.totalOrders,
        fractionDisplay: `${currentOrderStats.completedOrders}/${currentOrderStats.totalOrders} đơn`,
      },
      timezoneOffset,
      ui: {
        recentOrders,
        courseOverview,
        expert,
      },
    };
  },

  async listCourseEnrollments(courseId, userId, query = {}, roles = []) {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const now = new Date();
    const { timezoneOffset } = resolveTimezone(query, now);
    const { enrollments } = await loadCourseAnalyticsContext(courseId, userId, roles, now);

    const filtered = filterEnrollmentItems(enrollments, query).map(toEnrollmentListItem);
    const sorted = sortEnrollments(filtered, query.sortField, query.sortDirection);

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const paginated = paginate(sorted, page, limit);

    const summarySource = filterEnrollmentItems(enrollments, query);

    return {
      courseId,
      summary: computeSummaryStats(summarySource),
      pagination: paginated.pagination,
      items: paginated.items,
      timezoneOffset,
      allItems: sorted,
    };
  },

  async exportCourseEnrollmentsCsv(courseId, userId, query = {}, roles = []) {
    const list = await this.listCourseEnrollments(courseId, userId, {
      ...query,
      page: 1,
      limit: 100,
    }, roles);

    return {
      filename: `course-${courseId}-enrollments.csv`,
      csv: toCsv(
        list.allItems.map((item) => ({
          ...item,
          date: formatDateTimeWithOffset(item.date, list.timezoneOffset),
        }))
      ),
    };
  },
};

module.exports = expertAnalyticsService;
