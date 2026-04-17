const learnerDashboardRepository = require("../repositories/learner-dashboard.repository");
const AppError = require("../utils/AppError");

function num(value) {
  if (value === null || value === undefined) return 0;
  return typeof value === "object" && typeof value.toNumber === "function" ? value.toNumber() : Number(value);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toLocalDateKey(dateInput, timezoneOffset) {
  const date = new Date(dateInput);
  const shifted = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  return formatDateKey(shifted);
}

function dateKeyToUtcDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatHours(hours) {
  const normalized = round1(hours);
  const digits = Number.isInteger(normalized) ? 0 : 1;
  return `${normalized.toFixed(digits)} giờ`;
}

function formatPercent(value) {
  const normalized = round1(value);
  const digits = Number.isInteger(normalized) ? 0 : 1;
  return `${normalized.toFixed(digits)}%`;
}

function formatSignedPercent(value) {
  const normalized = round1(value);
  if (normalized === 0) return "0%";
  const digits = Number.isInteger(Math.abs(normalized)) ? 0 : 1;
  const sign = normalized > 0 ? "+" : "-";
  return `${sign}${Math.abs(normalized).toFixed(digits)}%`;
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return round1(((c - p) / p) * 100);
}

function formatTimeHm(dateInput, timezoneOffset) {
  const date = new Date(dateInput);
  const shifted = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getDisplayName(user) {
  if (user.full_name) return user.full_name;
  if (user.display_name) return user.display_name;
  if (user.email) return String(user.email).split("@")[0];
  return "Bạn";
}

function getFirstName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[parts.length - 1] || "Bạn";
}

function buildDateBuckets(days, timezoneOffset, now = new Date()) {
  const todayStartUtc = startOfLocalDayUtc(now, timezoneOffset);
  const startUtc = addDays(todayStartUtc, -(days - 1));
  const buckets = [];

  for (let index = 0; index < days; index += 1) {
    const dayStartUtc = addDays(startUtc, index);
    const localDate = new Date(dayStartUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
    buckets.push({
      key: formatDateKey(localDate),
      dateUtc: dayStartUtc,
      label: `T${index + 1}`,
      shortLabel: `${String(localDate.getUTCDate()).padStart(2, "0")}/${String(localDate.getUTCMonth() + 1).padStart(2, "0")}`,
      studyMinutes: 0,
      reviewMinutes: 0,
    });
  }

  return { startUtc, endUtc: addDays(todayStartUtc, 1), buckets };
}

function mapCourseStatus(progressPercent) {
  if (progressPercent >= 100) return "completed";
  if (progressPercent > 0) return "learning";
  return "not_started";
}

function buildCourseSupplementMaps(flashcardSets, questionRows) {
  const flashcardMap = new Map();
  const testMap = new Map();

  for (const row of flashcardSets) {
    const current = flashcardMap.get(row.course_id) || 0;
    flashcardMap.set(row.course_id, current + (row.total_cards || 0));
  }

  for (const row of questionRows) {
    const current = testMap.get(row.course_id) || new Set();
    current.add(row.lesson_id || row.question_id);
    testMap.set(row.course_id, current);
  }

  return {
    flashcardMap,
    testMap: new Map([...testMap.entries()].map(([courseId, lessons]) => [courseId, lessons.size])),
  };
}

function buildWeakPoints(answerRows) {
  const lessonMap = new Map();

  for (const row of answerRows) {
    const lessonId = row.cnt_questions?.mst_lessons?.lesson_id || row.cnt_questions?.question_id || "unknown";
    const lessonName = row.cnt_questions?.mst_lessons?.lesson_name || "Chủ đề chưa phân loại";
    const current = lessonMap.get(lessonId) || {
      lessonId,
      lessonName,
      total: 0,
      correct: 0,
    };

    current.total += 1;
    current.correct += row.is_correct ? 1 : 0;
    lessonMap.set(lessonId, current);
  }

  return [...lessonMap.values()]
    .map((item) => {
      const accuracyPercent = item.total > 0 ? round1((item.correct / item.total) * 100) : 0;
      let severity = "low";
      if (accuracyPercent < 50) severity = "high";
      else if (accuracyPercent < 70) severity = "medium";

      return {
        lessonId: item.lessonId,
        lessonName: item.lessonName,
        totalAnswers: item.total,
        accuracyPercent,
        accuracyDisplay: formatPercent(accuracyPercent),
        severity,
      };
    })
    .sort((left, right) => left.accuracyPercent - right.accuracyPercent || right.totalAnswers - left.totalAnswers)
    .slice(0, 3);
}

function buildPerformanceCard(currentAccuracy, previousAccuracy) {
  const safeCurrent = clamp(currentAccuracy, 0, 100);
  const safePrevious = clamp(previousAccuracy, 0, 100);
  const changePercent = pctChange(safeCurrent, safePrevious);

  return {
    averageAccuracy: safeCurrent,
    displayAverageAccuracy: formatPercent(safeCurrent),
    comparison: {
      previousAccuracy: safePrevious,
      previousDisplay: formatPercent(safePrevious),
      changePercent,
      changeDisplay: formatSignedPercent(changePercent),
      trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
    },
  };
}

const learnerDashboardService = {
  async getMyDashboard(userId, options = {}) {
    if (!userId) throw AppError.unauthorized("Authentication required");

    const days = clamp(parseInt(options.days, 10) || 12, 7, 30);
    const coursesLimit = clamp(parseInt(options.coursesLimit, 10) || 4, 1, 10);
    const reviewLimit = clamp(parseInt(options.reviewLimit, 10) || 5, 1, 10);
    const timezoneOffset = Number.isFinite(Number(options.timezoneOffset)) ? Number(options.timezoneOffset) : 0;

    const { startUtc, endUtc, buckets } = buildDateBuckets(days, timezoneOffset);
    const todayStartUtc = addDays(endUtc, -1);
    const localStartDate = dateKeyToUtcDate(toLocalDateKey(startUtc, timezoneOffset));
    const localEndDate = dateKeyToUtcDate(toLocalDateKey(todayStartUtc, timezoneOffset));
    const previousStartUtc = addDays(startUtc, -7);

    const [
      user,
      streak,
      studySessions,
      flashcardSessions,
      quizAttempts14Days,
      flashcardReviewsCount,
      completedTestsCount,
      latestReviews,
      activePurchases,
      recentCoursePurchase,
    ] = await Promise.all([
      learnerDashboardRepository.findUserProfile(userId),
      learnerDashboardRepository.findLearningStreak(userId),
      learnerDashboardRepository.findStudySessionsByDateRange(userId, localStartDate, localEndDate),
      learnerDashboardRepository.findFlashcardSessionsByRange(userId, startUtc, endUtc),
      learnerDashboardRepository.findQuizAttemptsByRange(userId, previousStartUtc, endUtc),
      learnerDashboardRepository.countFlashcardReviews(userId),
      learnerDashboardRepository.countCompletedQuizAttempts(userId),
      learnerDashboardRepository.findLatestFlashcardReviews(userId),
      learnerDashboardRepository.findActivePurchases(userId, Math.max(coursesLimit, 10)),
      learnerDashboardRepository.findRecentCoursePurchase(userId),
    ]);

    if (!user) throw AppError.notFound("User not found");

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    for (const session of studySessions) {
      const key = formatDateKey(new Date(session.session_date));
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.studyMinutes += num(session.study_duration_minutes);
    }

    for (const session of flashcardSessions) {
      const key = toLocalDateKey(session.started_at_utc, timezoneOffset);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      const durationMinutes = session.session_duration_seconds
        ? session.session_duration_seconds / 60
        : Math.max(num(session.cards_reviewed) * 0.75, 0);
      bucket.reviewMinutes += durationMinutes;
      if (bucket.studyMinutes < durationMinutes) {
        bucket.studyMinutes = durationMinutes;
      }
    }

    const studyTimeChart = buckets.map((bucket, index) => {
      const reviewMinutes = Math.max(0, bucket.reviewMinutes);
      const totalMinutes = Math.max(bucket.studyMinutes, reviewMinutes);
      const newStudyMinutes = Math.max(totalMinutes - reviewMinutes, 0);

      return {
        index: index + 1,
        label: bucket.label,
        shortLabel: bucket.shortLabel,
        date: bucket.key,
        totalMinutes: round1(totalMinutes),
        totalHours: round1(totalMinutes / 60),
        newStudyMinutes: round1(newStudyMinutes),
        newStudyHours: round1(newStudyMinutes / 60),
        reviewMinutes: round1(reviewMinutes),
        reviewHours: round1(reviewMinutes / 60),
        isToday: index === buckets.length - 1,
      };
    });

    const totalStudyHours = round1(studyTimeChart.reduce((sum, item) => sum + item.totalHours, 0));

    const currentWindowStart = addDays(endUtc, -7);
    const currentAttempts = quizAttempts14Days.filter(
      (attempt) => new Date(attempt.started_at_utc) >= currentWindowStart
    );
    const previousAttempts = quizAttempts14Days.filter((attempt) => {
      const startedAt = new Date(attempt.started_at_utc);
      return startedAt >= previousStartUtc && startedAt < currentWindowStart;
    });

    const averageAttemptScore = (attempts) => {
      const scored = attempts.filter((attempt) => attempt.percentage_score != null);
      if (scored.length === 0) return 0;
      return round1(scored.reduce((sum, attempt) => sum + num(attempt.percentage_score), 0) / scored.length);
    };

    const performance = buildPerformanceCard(
      averageAttemptScore(currentAttempts),
      averageAttemptScore(previousAttempts)
    );

    const todayReviewsMap = new Map();
    for (const review of latestReviews) {
      const nextReviewAt = review.next_review_at_utc ? new Date(review.next_review_at_utc) : null;
      if (!nextReviewAt || nextReviewAt < todayStartUtc || nextReviewAt >= endUtc) continue;

      const set = review.cnt_flashcard_items?.cnt_flashcards;
      if (!set?.flashcard_set_id) continue;

      const current = todayReviewsMap.get(set.flashcard_set_id) || {
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
      todayReviewsMap.set(set.flashcard_set_id, current);
    }

    const todayReviews = [...todayReviewsMap.values()]
      .sort((left, right) => new Date(left.scheduledAtUtc) - new Date(right.scheduledAtUtc))
      .slice(0, reviewLimit)
      .map((item) => ({
        ...item,
        scheduledTimeLabel: formatTimeHm(item.scheduledAtUtc, timezoneOffset),
        dueCountLabel: `${item.dueCount} flashcards`,
      }));

    const courseIds = activePurchases.map((item) => item.course_id);
    const [courseFlashcardSets, courseQuestionLessons, weakAnswerRows] = await Promise.all([
      learnerDashboardRepository.findCourseFlashcardSets(courseIds),
      learnerDashboardRepository.findCourseQuestionLessons(courseIds),
      recentCoursePurchase
        ? learnerDashboardRepository.findWeakQuizAnswersByCourse(userId, recentCoursePurchase.course_id)
        : Promise.resolve([]),
    ]);

    const { flashcardMap, testMap } = buildCourseSupplementMaps(courseFlashcardSets, courseQuestionLessons);

    const myCoursesItems = activePurchases.slice(0, coursesLimit).map((purchase) => {
      const progressPercent = round1(num(purchase.progress_percent));
      const course = purchase.mst_courses;
      const totalFlashcards = flashcardMap.get(purchase.course_id) || 0;
      const totalTests = testMap.get(purchase.course_id) || 0;

      return {
        courseId: purchase.course_id,
        courseName: course?.course_name || "Khóa học chưa xác định",
        category: course?.category || null,
        iconUrl: course?.course_icon_url || null,
        bannerUrl: course?.course_banner_url || null,
        progressPercent,
        progressDisplay: formatPercent(progressPercent),
        lessonsCompleted: purchase.lessons_completed || 0,
        totalLessons: course?.total_lessons || 0,
        chaptersCompleted: purchase.chapters_completed || 0,
        totalChapters: course?.total_chapters || 0,
        totalFlashcards,
        totalFlashcardsLabel: `${totalFlashcards} thẻ`,
        totalTests,
        totalTestsLabel: `${totalTests} bài thi`,
        status: mapCourseStatus(progressPercent),
        lastAccessedAtUtc: purchase.last_accessed_at_utc,
        completedAtUtc: purchase.completed_at_utc,
      };
    });

    const myCoursesCounts = activePurchases.reduce(
      (accumulator, purchase) => {
        const status = mapCourseStatus(round1(num(purchase.progress_percent)));
        accumulator.all += 1;
        accumulator[status] += 1;
        return accumulator;
      },
      { all: 0, learning: 0, completed: 0, not_started: 0 }
    );

    const recentCourse = recentCoursePurchase
      ? {
          courseId: recentCoursePurchase.course_id,
          courseName: recentCoursePurchase.mst_courses?.course_name || "Khóa học chưa xác định",
          category: recentCoursePurchase.mst_courses?.category || null,
          bannerUrl: recentCoursePurchase.mst_courses?.course_banner_url || null,
          iconUrl: recentCoursePurchase.mst_courses?.course_icon_url || null,
          progressPercent: round1(num(recentCoursePurchase.progress_percent)),
          progressDisplay: formatPercent(round1(num(recentCoursePurchase.progress_percent))),
          lessonsCompleted: recentCoursePurchase.lessons_completed || 0,
          totalLessons: recentCoursePurchase.mst_courses?.total_lessons || 0,
          chapterProgressText: `${recentCoursePurchase.chapters_completed || 0}/${recentCoursePurchase.mst_courses?.total_chapters || 0} chương`,
          lessonProgressText: `${recentCoursePurchase.lessons_completed || 0}/${recentCoursePurchase.mst_courses?.total_lessons || 0} bài học`,
          lastAccessedAtUtc: recentCoursePurchase.last_accessed_at_utc,
          weakPoints: buildWeakPoints(weakAnswerRows),
        }
      : null;

    const displayName = getDisplayName(user);
    const firstName = getFirstName(displayName);

    return {
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        greetingTitle: `Xin chào, ${firstName}!`,
        greetingSubtitle: "Hôm nay bạn muốn học gì?",
      },
      studyTime: {
        totalHours: totalStudyHours,
        displayTotalHours: formatHours(totalStudyHours),
        periodDays: days,
        chart: studyTimeChart,
      },
      performance: {
        title: "Hiệu suất",
        subtitle: "Điểm TB",
        ...performance,
      },
      todayReviews: {
        title: "Lịch ôn tập hôm nay",
        methodLabel: "Spaced Repetition",
        totalDueItems: todayReviews.reduce((sum, item) => sum + item.dueCount, 0),
        items: todayReviews,
      },
      quickStats: {
        streakDays: streak?.current_streak_days || 0,
        streakDisplay: `${streak?.current_streak_days || 0} ngày`,
        flashcardsReviewed: flashcardReviewsCount,
        flashcardsReviewedDisplay: String(flashcardReviewsCount),
        testsCompleted: completedTestsCount,
        testsCompletedDisplay: String(completedTestsCount),
      },
      recentCourse,
      myCourses: {
        title: "Môn học của tôi",
        counts: myCoursesCounts,
        items: myCoursesItems,
      },
      meta: {
        timezoneOffset,
        generatedAtUtc: new Date(),
      },
    };
  },
};

module.exports = learnerDashboardService;
