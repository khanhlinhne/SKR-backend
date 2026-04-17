const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const aiChatRepository = require("../repositories/ai-chat.repository");
const AppError = require("../utils/AppError");

const FALLBACK_MODEL = "gemini-2.5-flash";
const MODELS_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_HISTORY_MESSAGES = 8;
const MAX_MODEL_CANDIDATES = 3;
const MAX_RETRIES_PER_MODEL = 2;
const RETRY_DELAY_MS = 1200;
const STATIC_FLASH_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

let geminiClient;
let resolvedChatModelCandidatesCache = null;
let resolveChatModelsPromise = null;

function num(value) {
  if (value === null || value === undefined) return 0;
  return typeof value === "object" && typeof value.toNumber === "function" ? value.toNumber() : Number(value);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatPercent(value) {
  const normalized = round1(value);
  return Number.isInteger(normalized) ? `${normalized}%` : `${normalized.toFixed(1)}%`;
}

function formatHoursFromMinutes(minutes) {
  const hours = round1((Number(minutes) || 0) / 60);
  return Number.isInteger(hours) ? `${hours} giờ` : `${hours.toFixed(1)} giờ`;
}

function formatRating(value) {
  const normalized = round1(value);
  return Number.isInteger(normalized) ? `${normalized}.0/5` : `${normalized.toFixed(1)}/5`;
}

function formatPrice(amount, currencyCode = "VND", isFree = false) {
  if (isFree || Number(amount) === 0) return "miễn phí";
  const normalized = round1(num(amount));
  const displayValue = Number.isInteger(normalized)
    ? normalized.toLocaleString("vi-VN")
    : normalized.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return currencyCode === "VND" ? `${displayValue} VND` : `${displayValue} ${currencyCode}`;
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfLocalDayUtc(referenceDate, timezoneOffset) {
  const localMs = referenceDate.getTime() + timezoneOffset * 60 * 60 * 1000;
  const localDate = new Date(localMs);
  const startLocalMs = Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return new Date(startLocalMs - timezoneOffset * 60 * 60 * 1000);
}

function toLocalDateKey(dateInput, timezoneOffset) {
  const date = new Date(dateInput);
  const shifted = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  return formatDateKey(shifted);
}

function dateKeyToUtcDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatLocalDateTime(dateInput, timezoneOffset) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  const shifted = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const year = shifted.getUTCFullYear();
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function getDisplayName(user) {
  if (!user) return "Bạn";
  if (user.full_name) return user.full_name;
  if (user.display_name) return user.display_name;
  if (user.email) return String(user.email).split("@")[0];
  return "Bạn";
}

function sanitizeHistory(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: typeof item?.content === "string" ? item.content.trim() : "",
    }))
    .filter((item) => item.content);
}

function normalizeIntentText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveIntent(message) {
  const text = normalizeIntentText(message);

  if (
    (text.includes("nen mua") || text.includes("mua khoa") || text.includes("mua mon")) &&
    (text.includes("khoa") || text.includes("mon") || text.includes("course"))
  ) {
    return "purchase_recommendation";
  }

  if (text.includes("mien phi") || text.includes("free course") || text.includes("khoa free")) {
    return "free_courses";
  }

  if (
    text.includes("top khoa hoc") ||
    text.includes("top course") ||
    text.includes("khoa hoc he thong") ||
    text.includes("top mon")
  ) {
    return "top_system_courses";
  }

  if (
    text.includes("hom nay") &&
    (text.includes("hoc bao lau") ||
      text.includes("thoi gian hoc") ||
      text.includes("bao nhieu gio") ||
      text.includes("da hoc bao nhieu"))
  ) {
    return "today_study_time";
  }

  if (text.includes("tien do") || text.includes("cao nhat") || text.includes("progress")) {
    return "top_progress_course";
  }

  if (text.includes("danh gia") || text.includes("rating") || text.includes("sao")) {
    return "top_rated_course";
  }

  if (text.includes("gan day") || text.includes("moi hoc") || text.includes("gan nhat")) {
    return "recent_course";
  }

  if (text.includes("on") || text.includes("flashcard") || text.includes("review")) {
    return "review_plan";
  }

  if (text.includes("nen hoc") || text.includes("goi y") || text.includes("tiep theo")) {
    return "recommendation";
  }

  return detectIntent(message);
}

function detectIntent(message) {
  const text = String(message || "").toLowerCase();

  if (
    (text.includes("nên mua") || text.includes("mua khóa") || text.includes("mua môn")) &&
    (text.includes("khóa") || text.includes("môn") || text.includes("course"))
  ) {
    return "purchase_recommendation";
  }

  if (text.includes("miễn phí") || text.includes("free course") || text.includes("khóa free")) {
    return "free_courses";
  }

  if (
    text.includes("top khóa học") ||
    text.includes("top course") ||
    text.includes("khóa học hệ thống") ||
    text.includes("top môn")
  ) {
    return "top_system_courses";
  }

  if (
    text.includes("hôm nay") &&
    (text.includes("học bao lâu") ||
      text.includes("thời gian học") ||
      text.includes("bao nhiêu giờ") ||
      text.includes("đã học bao nhiêu"))
  ) {
    return "today_study_time";
  }

  if (text.includes("tiến độ") || text.includes("cao nhất") || text.includes("progress")) {
    return "top_progress_course";
  }

  if (text.includes("đánh giá") || text.includes("rating") || text.includes("sao")) {
    return "top_rated_course";
  }

  if (text.includes("gần đây") || text.includes("mới học") || text.includes("gần nhất")) {
    return "recent_course";
  }

  if (text.includes("ôn") || text.includes("flashcard") || text.includes("review")) {
    return "review_plan";
  }

  if (text.includes("nên học") || text.includes("gợi ý") || text.includes("tiếp theo")) {
    return "recommendation";
  }

  return "general";
}

function buildReviewsDueToday(reviewRows, startUtc, endUtc, timezoneOffset) {
  const setMap = new Map();

  for (const row of reviewRows) {
    const nextReviewAt = row.next_review_at_utc ? new Date(row.next_review_at_utc) : null;
    if (!nextReviewAt || nextReviewAt < startUtc || nextReviewAt >= endUtc) continue;

    const set = row.cnt_flashcard_items?.cnt_flashcards;
    if (!set?.flashcard_set_id) continue;

    const current = setMap.get(set.flashcard_set_id) || {
      flashcardSetId: set.flashcard_set_id,
      setTitle: set.set_title,
      courseId: set.course_id,
      courseName: set.mst_courses?.course_name || null,
      scheduledAtUtc: nextReviewAt,
      dueCount: 0,
    };

    current.dueCount += 1;
    if (nextReviewAt < current.scheduledAtUtc) {
      current.scheduledAtUtc = nextReviewAt;
    }
    setMap.set(set.flashcard_set_id, current);
  }

  return [...setMap.values()]
    .sort((left, right) => new Date(left.scheduledAtUtc) - new Date(right.scheduledAtUtc))
    .map((item) => ({
      ...item,
      scheduledTimeLocal: formatLocalDateTime(item.scheduledAtUtc, timezoneOffset),
    }));
}

function normalizePurchase(purchase, timezoneOffset) {
  const progressPercent = round1(num(purchase.progress_percent));

  return {
    courseId: purchase.course_id,
    courseName: purchase.mst_courses?.course_name || "Khóa học chưa xác định",
    category: purchase.mst_courses?.category || null,
    progressPercent,
    progressDisplay: formatPercent(progressPercent),
    lessonsCompleted: purchase.lessons_completed || 0,
    totalLessons: purchase.mst_courses?.total_lessons || 0,
    chaptersCompleted: purchase.chapters_completed || 0,
    totalChapters: purchase.mst_courses?.total_chapters || 0,
    estimatedDurationHours: purchase.mst_courses?.estimated_duration_hours || null,
    ratingAverage:
      purchase.mst_courses?.rating_average != null ? round1(num(purchase.mst_courses.rating_average)) : null,
    ratingDisplay:
      purchase.mst_courses?.rating_average != null
        ? formatRating(num(purchase.mst_courses.rating_average))
        : null,
    ratingCount: purchase.mst_courses?.rating_count || 0,
    userRating: purchase.user_rating || null,
    lastAccessedAtUtc: purchase.last_accessed_at_utc,
    lastAccessedAtLocal: formatLocalDateTime(purchase.last_accessed_at_utc, timezoneOffset),
    purchasedAtUtc: purchase.purchased_at_utc,
    completedAtUtc: purchase.completed_at_utc,
  };
}

function normalizeTopRatedCourses(courses) {
  return courses.map((course) => ({
    courseId: course.course_id,
    courseName: course.course_name,
    category: course.category,
    ratingAverage: round1(num(course.rating_average)),
    ratingDisplay: formatRating(num(course.rating_average)),
    ratingCount: course.rating_count || 0,
    totalLessons: course.total_lessons || 0,
    estimatedDurationHours: course.estimated_duration_hours || null,
  }));
}

function normalizeCatalogCourse(course) {
  return {
    courseId: course.course_id,
    courseName: course.course_name,
    category: course.category,
    isFree: Boolean(course.is_free),
    priceAmount: num(course.price_amount),
    originalPrice: course.original_price != null ? num(course.original_price) : null,
    currencyCode: course.currency_code || "VND",
    priceDisplay: formatPrice(course.price_amount, course.currency_code, course.is_free),
    discountPercent: course.discount_percent || 0,
    totalLessons: course.total_lessons || 0,
    totalChapters: course.total_chapters || 0,
    estimatedDurationHours: course.estimated_duration_hours || null,
    ratingAverage: course.rating_average != null ? round1(num(course.rating_average)) : null,
    ratingDisplay: course.rating_average != null ? formatRating(num(course.rating_average)) : null,
    ratingCount: course.rating_count || 0,
    purchaseCount: course.purchase_count || 0,
    isFeatured: Boolean(course.is_featured),
    status: course.status || null,
    publishedAtUtc: course.published_at_utc || null,
  };
}

function averageQuizScore(attempts) {
  const scored = attempts.filter((item) => item.percentage_score != null);
  if (scored.length === 0) return 0;
  return round1(scored.reduce((sum, item) => sum + num(item.percentage_score), 0) / scored.length);
}

async function buildLearningSnapshot(userId, timezoneOffsetInput) {
  if (!userId) {
    throw AppError.unauthorized("Authentication required");
  }

  const user = await aiChatRepository.findUserProfile(userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const timezoneOffset = Number.isFinite(Number(timezoneOffsetInput))
    ? Number(timezoneOffsetInput)
    : Number(user.timezone_offset) || 0;

  const now = new Date();
  const todayStartUtc = startOfLocalDayUtc(now, timezoneOffset);
  const todayEndUtc = addDays(todayStartUtc, 1);
  const localTodayKey = toLocalDateKey(now, timezoneOffset);
  const localTodayDate = dateKeyToUtcDate(localTodayKey);
  const recentQuizWindowStart = addDays(todayStartUtc, -7);

  const [
    streak,
    todayStudySessions,
    todayFlashcardSessions,
    latestFlashcardReviews,
    activePurchases,
    recentQuizAttempts,
    topRatedCourses,
    topSystemCourses,
    freeCourses,
  ] = await Promise.all([
    aiChatRepository.findLearningStreak(userId),
    aiChatRepository.findTodayStudySessions(userId, localTodayDate),
    aiChatRepository.findTodayFlashcardSessions(userId, todayStartUtc, todayEndUtc),
    aiChatRepository.findLatestFlashcardReviews(userId),
    aiChatRepository.findActivePurchases(userId),
    aiChatRepository.findRecentQuizAttempts(userId, recentQuizWindowStart),
    aiChatRepository.findTopRatedCourses(5),
    aiChatRepository.findTopSystemCourses(5),
    aiChatRepository.findFreeCourses(5),
  ]);

  const studySessionMinutes = todayStudySessions.reduce(
    (sum, session) => sum + num(session.study_duration_minutes),
    0
  );
  const flashcardMinutes = todayFlashcardSessions.reduce((sum, session) => {
    const durationMinutes = session.session_duration_seconds
      ? session.session_duration_seconds / 60
      : Math.max(num(session.cards_reviewed) * 0.75, 0);
    return sum + durationMinutes;
  }, 0);
  const totalTodayMinutes = round1(Math.max(studySessionMinutes, flashcardMinutes));

  const reviewsDueToday = buildReviewsDueToday(
    latestFlashcardReviews,
    todayStartUtc,
    todayEndUtc,
    timezoneOffset
  );

  const enrolledCourses = activePurchases.map((purchase) => normalizePurchase(purchase, timezoneOffset));
  const enrolledCourseIds = enrolledCourses.map((course) => course.courseId);
  const preferredCategories = [...new Set(enrolledCourses.map((course) => course.category).filter(Boolean))];
  const topProgressCourse =
    [...enrolledCourses].sort(
      (left, right) =>
        right.progressPercent - left.progressPercent ||
        new Date(right.lastAccessedAtUtc || 0) - new Date(left.lastAccessedAtUtc || 0)
    )[0] || null;

  const topRatedEnrolledCourse =
    [...enrolledCourses].sort(
      (left, right) =>
        (right.ratingAverage || 0) - (left.ratingAverage || 0) ||
        (right.ratingCount || 0) - (left.ratingCount || 0)
    )[0] || null;

  const recentCourse =
    [...enrolledCourses].sort(
      (left, right) =>
        new Date(right.lastAccessedAtUtc || right.purchasedAtUtc || 0) -
        new Date(left.lastAccessedAtUtc || left.purchasedAtUtc || 0)
    )[0] || null;

  let recommendedCourses = await aiChatRepository.findRecommendedCourses(
    enrolledCourseIds,
    preferredCategories,
    5
  );
  if (!recommendedCourses.length) {
    recommendedCourses = topSystemCourses.filter((course) => !enrolledCourseIds.includes(course.course_id));
  }

  const normalizedQuizAttempts = recentQuizAttempts.map((attempt) => ({
    attemptId: attempt.attempt_id,
    quizTitle: attempt.quiz_title || "Bài quiz chưa đặt tên",
    percentageScore: attempt.percentage_score != null ? round1(num(attempt.percentage_score)) : null,
    percentageDisplay:
      attempt.percentage_score != null ? formatPercent(num(attempt.percentage_score)) : null,
    totalQuestions: attempt.total_questions,
    correctAnswers: attempt.correct_answers || 0,
    startedAtUtc: attempt.started_at_utc,
    startedAtLocal: formatLocalDateTime(attempt.started_at_utc, timezoneOffset),
    status: attempt.status,
  }));

  return {
    user: {
      userId: user.user_id,
      displayName: getDisplayName(user),
      timezoneOffset,
    },
    today: {
      dateKey: localTodayKey,
      totalStudyMinutes: totalTodayMinutes,
      totalStudyHoursDisplay: formatHoursFromMinutes(totalTodayMinutes),
      studySessionMinutes: round1(studySessionMinutes),
      flashcardMinutes: round1(flashcardMinutes),
      studySessionsCount: todayStudySessions.length,
      flashcardSessionsCount: todayFlashcardSessions.length,
      reviewsDueCount: reviewsDueToday.reduce((sum, item) => sum + item.dueCount, 0),
    },
    streak: {
      currentDays: streak?.current_streak_days || 0,
      totalStudyDays: streak?.total_study_days || 0,
      totalStudyHours: round1(num(streak?.total_study_hours)),
    },
    courses: {
      totalActive: enrolledCourses.length,
      recentCourse,
      topProgressCourse,
      topRatedEnrolledCourse,
      enrolled: enrolledCourses.slice(0, 6),
      topRatedPlatform: normalizeTopRatedCourses(topRatedCourses).slice(0, 3),
      topSystem: topSystemCourses.map(normalizeCatalogCourse).slice(0, 5),
      freeCatalog: freeCourses.map(normalizeCatalogCourse).slice(0, 5),
      recommendedToBuy: recommendedCourses.map(normalizeCatalogCourse).slice(0, 5),
    },
    reviews: reviewsDueToday.slice(0, 5),
    quizzes: {
      attemptsLast7Days: normalizedQuizAttempts.length,
      averageScoreLast7Days: averageQuizScore(recentQuizAttempts),
      averageScoreDisplay: formatPercent(averageQuizScore(recentQuizAttempts)),
      latestAttempt: normalizedQuizAttempts[0] || null,
    },
    generatedAtUtc: now.toISOString(),
  };
}

function buildDataPoints(intent, snapshot) {
  const dataPoints = [];

  if (intent === "today_study_time" || intent === "general" || intent === "recommendation") {
    dataPoints.push({
      label: "Thời gian học hôm nay",
      value: snapshot.today.totalStudyHoursDisplay,
    });
  }

  if (
    (intent === "top_progress_course" || intent === "general" || intent === "recommendation") &&
    snapshot.courses.topProgressCourse
  ) {
    dataPoints.push({
      label: "Khóa học tiến độ cao nhất",
      value: `${snapshot.courses.topProgressCourse.courseName} (${snapshot.courses.topProgressCourse.progressDisplay})`,
    });
  }

  if (intent === "top_rated_course" && snapshot.courses.topRatedEnrolledCourse) {
    dataPoints.push({
      label: "Khóa học rating cao nhất của bạn",
      value: `${snapshot.courses.topRatedEnrolledCourse.courseName} (${snapshot.courses.topRatedEnrolledCourse.ratingDisplay})`,
    });
  }

  if (intent === "top_rated_course" && snapshot.courses.topRatedPlatform[0]) {
    dataPoints.push({
      label: "Khóa học rating cao nhất toàn hệ thống",
      value: `${snapshot.courses.topRatedPlatform[0].courseName} (${snapshot.courses.topRatedPlatform[0].ratingDisplay})`,
    });
  }

  if (intent === "free_courses" && snapshot.courses.freeCatalog[0]) {
    dataPoints.push({
      label: "Khoa mien phi noi bat",
      value: `${snapshot.courses.freeCatalog[0].courseName} (${snapshot.courses.freeCatalog[0].ratingDisplay || "chua co rating"})`,
    });
  }

  if (intent === "top_system_courses" && snapshot.courses.topSystem[0]) {
    dataPoints.push({
      label: "Top khoa hoc he thong",
      value: `${snapshot.courses.topSystem[0].courseName} (${snapshot.courses.topSystem[0].purchaseCount} luot mua)`,
    });
  }

  if (intent === "purchase_recommendation" && snapshot.courses.recommendedToBuy[0]) {
    dataPoints.push({
      label: "Khoa nen mua",
      value: `${snapshot.courses.recommendedToBuy[0].courseName} (${snapshot.courses.recommendedToBuy[0].priceDisplay})`,
    });
  }

  if ((intent === "review_plan" || intent === "recommendation") && snapshot.today.reviewsDueCount > 0) {
    dataPoints.push({
      label: "Lượt ôn tập hôm nay",
      value: `${snapshot.today.reviewsDueCount} flashcards`,
    });
  }

  if ((intent === "recent_course" || intent === "general") && snapshot.courses.recentCourse) {
    dataPoints.push({
      label: "Môn gần đây nhất",
      value: snapshot.courses.recentCourse.courseName,
    });
  }

  if (snapshot.quizzes.latestAttempt && (intent === "general" || intent === "recommendation")) {
    dataPoints.push({
      label: "Quiz gần nhất",
      value: `${snapshot.quizzes.latestAttempt.quizTitle} (${snapshot.quizzes.latestAttempt.percentageDisplay || "chưa có điểm"})`,
    });
  }

  return dataPoints.slice(0, 4);
}

function buildFollowUpSuggestions(intent, snapshot) {
  const courseName = snapshot.courses.topProgressCourse?.courseName;
  const reviewSet = snapshot.reviews[0]?.setTitle;
  const suggestionsByIntent = {
    purchase_recommendation: [
      "Khóa miễn phí nào đáng học?",
      "Top khóa học hệ thống hiện tại là gì?",
      "Khóa nào hợp với môn tôi đang học?",
    ],
    free_courses: [
      "Top khóa học hệ thống hiện tại là gì?",
      "Tôi nên mua khóa nào để học tiếp?",
      "Khóa miễn phí nào rating cao nhất?",
    ],
    top_system_courses: [
      "Khóa miễn phí nào đáng học?",
      "Tôi nên mua khóa nào để học tiếp?",
      "Khóa nào đang được mua nhiều nhất?",
    ],
    today_study_time: [
      "Khóa học nào của tôi có tiến độ cao nhất?",
      "Tôi nên ôn gì hôm nay?",
      "Môn học gần đây nhất của tôi là gì?",
    ],
    top_progress_course: [
      "Môn học gần đây nhất của tôi là gì?",
      "Hôm nay tôi đã học bao lâu?",
      "Tôi nên học gì tiếp theo hôm nay?",
    ],
    top_rated_course: [
      "Khóa học nào của tôi có tiến độ cao nhất?",
      "Môn học gần đây nhất của tôi là gì?",
      "Tôi nên ôn gì hôm nay?",
    ],
    recent_course: [
      "Khóa học nào của tôi có tiến độ cao nhất?",
      "Hôm nay tôi đã học bao lâu?",
      "Tôi nên học gì tiếp theo hôm nay?",
    ],
    review_plan: [
      "Hôm nay tôi đã học bao lâu?",
      "Khóa học nào của tôi có tiến độ cao nhất?",
      "Gợi ý học tiếp theo cho tôi.",
    ],
    recommendation: [
      "Hôm nay tôi đã học bao lâu?",
      "Môn học gần đây nhất của tôi là gì?",
      "Khóa học nào của tôi có tiến độ cao nhất?",
    ],
    general: [
      "Hôm nay tôi đã học bao lâu?",
      "Khóa học nào của tôi có tiến độ cao nhất?",
      "Tôi nên ôn gì hôm nay?",
    ],
  };

  const suggestions = suggestionsByIntent[intent] || suggestionsByIntent.general;
  return suggestions.map((item, index) => {
    if (index === 0 && reviewSet && intent === "review_plan") {
      return `Tôi cần ôn gì trong bộ ${reviewSet}?`;
    }
    if (index === 0 && courseName && intent === "top_progress_course") {
      return `${courseName} còn bao nhiêu bài chưa học?`;
    }
    return item;
  });
}

function buildDeterministicAnswer(intent, snapshot, message) {
  const personalizedRatingQuestion =
    /\bcủa tôi\b|\bđang học\b|\bcourse của tôi\b/i.test(String(message || ""));

  switch (intent) {
    case "purchase_recommendation":
      if (!snapshot.courses.recommendedToBuy.length) {
        return "Hiện mình chưa tìm được khóa học phù hợp để gợi ý mua thêm từ catalog hệ thống.";
      }
      return `${snapshot.courses.recommendedToBuy[0].courseName} là gợi ý mua phù hợp nhất lúc này với giá ${snapshot.courses.recommendedToBuy[0].priceDisplay}${snapshot.courses.recommendedToBuy[0].ratingDisplay ? ` và rating ${snapshot.courses.recommendedToBuy[0].ratingDisplay}` : ""}. ${snapshot.courses.recommendedToBuy[0].category ? `Khóa này thuộc nhóm ${snapshot.courses.recommendedToBuy[0].category}.` : ""}`;

    case "free_courses":
      if (!snapshot.courses.freeCatalog.length) {
        return "Hiện mình chưa thấy khóa học miễn phí nào đang xuất bản trên hệ thống.";
      }
      return `Một số khóa miễn phí nổi bật hiện có là ${snapshot.courses.freeCatalog
        .slice(0, 3)
        .map((course) => `${course.courseName}${course.ratingDisplay ? ` (${course.ratingDisplay})` : ""}`)
        .join(", ")}.`;

    case "top_system_courses":
      if (!snapshot.courses.topSystem.length) {
        return "Hiện mình chưa thấy dữ liệu xếp hạng khóa học toàn hệ thống.";
      }
      return `Top khóa học hệ thống hiện tại gồm ${snapshot.courses.topSystem
        .slice(0, 3)
        .map(
          (course, index) =>
            `${index + 1}. ${course.courseName}${course.ratingDisplay ? ` - ${course.ratingDisplay}` : ""}${course.purchaseCount ? `, ${course.purchaseCount} lượt mua` : ""}`
        )
        .join("; ")}.`;

    case "today_study_time":
      return `Hôm nay hệ thống ghi nhận khoảng ${snapshot.today.totalStudyHoursDisplay} học tập của bạn. Trong đó có ${formatHoursFromMinutes(
        snapshot.today.studySessionMinutes
      )} từ study session và khoảng ${formatHoursFromMinutes(
        snapshot.today.flashcardMinutes
      )} từ phiên flashcard. Hiện bạn còn ${snapshot.today.reviewsDueCount} flashcards cần ôn trong hôm nay.`;

    case "top_progress_course":
      if (!snapshot.courses.topProgressCourse) {
        return "Hiện mình chưa thấy khóa học đang hoạt động nào của bạn, nên chưa xác định được môn có tiến độ cao nhất.";
      }
      return `${snapshot.courses.topProgressCourse.courseName} đang là khóa học có tiến độ cao nhất với ${snapshot.courses.topProgressCourse.progressDisplay}. Bạn đã hoàn thành ${snapshot.courses.topProgressCourse.lessonsCompleted}/${snapshot.courses.topProgressCourse.totalLessons} bài và ${snapshot.courses.topProgressCourse.chaptersCompleted}/${snapshot.courses.topProgressCourse.totalChapters} chương.`;

    case "top_rated_course":
      if (personalizedRatingQuestion) {
        if (!snapshot.courses.topRatedEnrolledCourse) {
          return "Hiện mình chưa thấy khóa học đang học nào có dữ liệu rating để so sánh.";
        }
        return `${snapshot.courses.topRatedEnrolledCourse.courseName} đang là khóa học được đánh giá cao nhất trong các môn bạn đang học, với rating ${snapshot.courses.topRatedEnrolledCourse.ratingDisplay} từ ${snapshot.courses.topRatedEnrolledCourse.ratingCount} lượt đánh giá.`;
      }
      if (!snapshot.courses.topRatedPlatform[0]) {
        return "Hiện mình chưa thấy dữ liệu rating khóa học trên hệ thống để xếp hạng.";
      }
      return `${snapshot.courses.topRatedPlatform[0].courseName} đang là môn được đánh giá cao nhất trên hệ thống với rating ${snapshot.courses.topRatedPlatform[0].ratingDisplay} từ ${snapshot.courses.topRatedPlatform[0].ratingCount} lượt đánh giá.${snapshot.courses.topRatedEnrolledCourse ? ` Nếu chỉ xét các môn của bạn, ${snapshot.courses.topRatedEnrolledCourse.courseName} đang cao nhất với ${snapshot.courses.topRatedEnrolledCourse.ratingDisplay}.` : ""}`;

    case "recent_course":
      if (!snapshot.courses.recentCourse) {
        return "Mình chưa thấy lịch sử truy cập khóa học gần đây của bạn.";
      }
      return `${snapshot.courses.recentCourse.courseName} là môn bạn truy cập gần đây nhất${snapshot.courses.recentCourse.lastAccessedAtLocal ? ` vào ${snapshot.courses.recentCourse.lastAccessedAtLocal}` : ""}. Tiến độ hiện tại của môn này là ${snapshot.courses.recentCourse.progressDisplay}.`;

    case "review_plan":
      if (snapshot.reviews.length === 0) {
        return "Hôm nay hiện chưa có flashcard nào đến lịch ôn. Bạn có thể tiếp tục học khóa đang có tiến độ cao nhất hoặc làm thêm quiz để tạo dữ liệu ôn tập mới.";
      }
      return `Hôm nay bạn có ${snapshot.today.reviewsDueCount} flashcards cần ôn. Ưu tiên gần nhất là ${snapshot.reviews[0].setTitle}${snapshot.reviews[0].courseName ? ` của môn ${snapshot.reviews[0].courseName}` : ""}, lịch ôn lúc ${snapshot.reviews[0].scheduledTimeLocal}.`;

    case "recommendation":
      if (snapshot.reviews.length > 0) {
        return `Ưu tiên tốt nhất hôm nay là xử lý ${snapshot.today.reviewsDueCount} flashcards đến hạn, bắt đầu từ ${snapshot.reviews[0].setTitle}. Sau đó bạn nên quay lại ${snapshot.courses.topProgressCourse?.courseName || "khóa học đang học"} để giữ nhịp tiến độ.`;
      }
      if (snapshot.courses.topProgressCourse) {
        return `Bạn nên tiếp tục ${snapshot.courses.topProgressCourse.courseName} vì đây là môn có tiến độ cao nhất (${snapshot.courses.topProgressCourse.progressDisplay}) và dễ tạo đà hoàn thành trước. ${snapshot.quizzes.latestAttempt ? `Sau đó có thể làm thêm một quiz vì bài gần nhất của bạn đang ở mức ${snapshot.quizzes.latestAttempt.percentageDisplay || "chưa có điểm"}.` : ""}`;
      }
      return "Mình chưa thấy đủ dữ liệu học tập để gợi ý sâu hơn. Bước hợp lý nhất là bắt đầu một buổi học hoặc làm một quiz/flashcard đầu tiên để hệ thống có dữ liệu phân tích.";

    case "general":
    default:
      return `Hôm nay bạn đã học khoảng ${snapshot.today.totalStudyHoursDisplay}. ${snapshot.courses.topProgressCourse ? `${snapshot.courses.topProgressCourse.courseName} đang dẫn đầu tiến độ với ${snapshot.courses.topProgressCourse.progressDisplay}. ` : ""}${snapshot.reviews.length > 0 ? `Bạn cũng có ${snapshot.today.reviewsDueCount} flashcards cần ôn hôm nay.` : "Hiện chưa có flashcard nào đến hạn ôn hôm nay."}`;
  }
}

function parseJsonSafe(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function dedupeList(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function scoreFlashModel(modelName) {
  const short = String(modelName || "").replace(/^models\//, "");
  const match = short.match(/gemini-([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0;
}

async function listAvailableFlashModels(apiKey) {
  const collected = [];
  let pageToken;

  do {
    const params = { key: apiKey, pageSize: 100 };
    if (pageToken) params.pageToken = pageToken;
    const { data } = await axios.get(MODELS_LIST_URL, { params, timeout: 20000 });
    collected.push(...(data.models || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const candidates = collected
    .filter((item) => item.name && /flash/i.test(item.name))
    .filter((item) => !/lite|image|tts|live|embedding/i.test(item.name))
    .filter(
      (item) =>
        Array.isArray(item.supportedGenerationMethods) &&
        item.supportedGenerationMethods.includes("generateContent")
    )
    .map((item) => item.name.replace(/^models\//, ""));

  return dedupeList(candidates).sort(
    (left, right) => scoreFlashModel(right) - scoreFlashModel(left) || left.localeCompare(right)
  );
}

async function getGeminiModelCandidates() {
  const apiKey = config.gemini?.apiKey?.trim();
  if (!apiKey) return [];

  const configuredModel =
    config.gemini?.model && config.gemini.model !== "auto" ? config.gemini.model : null;

  if (configuredModel) {
    return dedupeList([configuredModel, ...STATIC_FLASH_MODELS]).slice(0, MAX_MODEL_CANDIDATES);
  }

  if (resolvedChatModelCandidatesCache) {
    return resolvedChatModelCandidatesCache;
  }

  if (!resolveChatModelsPromise) {
    resolveChatModelsPromise = listAvailableFlashModels(apiKey)
      .then((models) => {
        const finalCandidates = dedupeList([...models, ...STATIC_FLASH_MODELS]).slice(
          0,
          MAX_MODEL_CANDIDATES
        );
        resolvedChatModelCandidatesCache = finalCandidates.length
          ? finalCandidates
          : STATIC_FLASH_MODELS.slice(0, MAX_MODEL_CANDIDATES);
        resolveChatModelsPromise = null;
        return resolvedChatModelCandidatesCache;
      })
      .catch((error) => {
        console.warn("[AI Chat] Could not list Gemini models, using static fallbacks:", error.message);
        resolvedChatModelCandidatesCache = STATIC_FLASH_MODELS.slice(0, MAX_MODEL_CANDIDATES);
        resolveChatModelsPromise = null;
        return resolvedChatModelCandidatesCache;
      });
  }

  return resolveChatModelsPromise;
}

function getGeminiModelInstance(modelName) {
  const apiKey = config.gemini?.apiKey?.trim();
  if (!apiKey || !modelName) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return {
    model: geminiClient.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.35,
      },
    }),
    modelName,
  };
}

function isRetryableGeminiError(error) {
  const status = error?.status || error?.response?.status;
  const message = String(error?.message || "");

  return (
    [429, 500, 503, 504].includes(status) ||
    /503|service unavailable|high demand|429|too many requests|resource_exhausted|rate limit|timeout|timed out|econnreset/i.test(
      message
    )
  );
}

function simplifyGeminiError(error) {
  const message = String(error?.message || "Gemini request failed");

  if (/high demand|service unavailable|503/i.test(message)) {
    return "gemini_high_demand";
  }
  if (/429|too many requests|resource_exhausted|rate limit/i.test(message)) {
    return "gemini_rate_limited";
  }
  if (/api key|permission|forbidden|401|403/i.test(message)) {
    return "gemini_auth_error";
  }
  if (/404|not found|model/i.test(message)) {
    return "gemini_model_unavailable";
  }

  return "gemini_request_failed";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateAiAnswer({ message, history, intent, snapshot, dataPoints, language }) {
  const candidateModels = await getGeminiModelCandidates();
  if (!candidateModels.length) {
    return {
      ok: false,
      attemptedModels: [],
      fallbackReason: "gemini_not_configured",
      lastError: "Gemini API key is missing or no compatible model candidates were found.",
    };
  }

  const prompt = `You are Learner AI Assistant for an education platform.
Answer ONLY from the provided JSON context. Do not invent facts or mention missing data as if it exists.
If the question cannot be answered fully from the context, say so briefly and suggest a nearby question.
Reply in ${language === "en" ? "English" : "Vietnamese"}.
Keep the answer concise, natural, grounded in the numbers, and tailored to the user's specific question.
Use the conversation history to interpret follow-up questions.
Do not repeat the same generic opening across answers.

Return valid JSON only with this schema:
{
  "answer": "string",
  "followUpSuggestions": ["string"],
  "citedMetrics": [{ "label": "string", "value": "string" }]
}

Detected intent: ${intent}
Conversation history:
${JSON.stringify(history)}

Current user question:
${JSON.stringify(message)}

Structured context:
${JSON.stringify(snapshot)}

Preferred cited metrics:
${JSON.stringify(dataPoints)}
`;

  const attemptedModels = [];
  let lastError = null;
  let fallbackReason = "gemini_request_failed";

  for (const modelName of candidateModels) {
    const gemini = getGeminiModelInstance(modelName);
    if (!gemini) continue;

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      attemptedModels.push(`${modelName}#${attempt}`);

      try {
        const result = await gemini.model.generateContent(prompt);
        const parsed = parseJsonSafe(result.response.text());
        if (!parsed || typeof parsed.answer !== "string") {
          lastError = "Gemini returned invalid JSON for chat response.";
          fallbackReason = "gemini_invalid_json";
          break;
        }

        return {
          ok: true,
          answer: parsed.answer.trim(),
          followUpSuggestions: Array.isArray(parsed.followUpSuggestions)
            ? parsed.followUpSuggestions.filter(Boolean).slice(0, 3)
            : [],
          citedMetrics: Array.isArray(parsed.citedMetrics)
            ? parsed.citedMetrics.slice(0, 4)
            : dataPoints,
          model: gemini.modelName,
          attemptedModels,
        };
      } catch (error) {
        lastError = error?.message || String(error);
        fallbackReason = simplifyGeminiError(error);

        const retryable = isRetryableGeminiError(error);
        const hasAnotherAttempt = attempt < MAX_RETRIES_PER_MODEL;
        if (retryable && hasAnotherAttempt) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }
    }
  }

  console.warn(
    "[AI Chat] Gemini chat fallback triggered:",
    JSON.stringify({
      attemptedModels,
      fallbackReason,
      lastError,
    })
  );

  return {
    ok: false,
    attemptedModels,
    fallbackReason,
    lastError,
  };
}

const aiChatService = {
  async reply({ userId, message, messages, language = "vi", timezoneOffset, includeContext = false }) {
    const snapshot = await buildLearningSnapshot(userId, timezoneOffset);
    const intent = resolveIntent(message);
    const history = sanitizeHistory(messages);
    const dataPoints = buildDataPoints(intent, snapshot);
    const deterministicAnswer = buildDeterministicAnswer(intent, snapshot, message);
    const suggestions = buildFollowUpSuggestions(intent, snapshot);

    const aiResult = await generateAiAnswer({
      message,
      history,
      intent,
      snapshot,
      dataPoints,
      language,
    });

    const usedAiAnswer = Boolean(aiResult?.ok);

    return {
      answer: usedAiAnswer ? aiResult.answer : deterministicAnswer,
      followUpSuggestions:
        usedAiAnswer && aiResult.followUpSuggestions?.length > 0
          ? aiResult.followUpSuggestions
          : suggestions,
      citedMetrics:
        usedAiAnswer && aiResult.citedMetrics?.length > 0 ? aiResult.citedMetrics : dataPoints,
      intent,
      language,
      meta: {
        usedModel: usedAiAnswer ? aiResult.model : null,
        usedFallback: !usedAiAnswer,
        fallbackReason: usedAiAnswer ? null : aiResult?.fallbackReason || "deterministic_fallback",
        attemptedModels: aiResult?.attemptedModels || [],
        lastAiError: usedAiAnswer ? null : aiResult?.lastError || null,
        generatedAtUtc: snapshot.generatedAtUtc,
        timezoneOffset: snapshot.user.timezoneOffset,
      },
      ...(includeContext ? { context: snapshot } : {}),
    };
  },
};

module.exports = aiChatService;
