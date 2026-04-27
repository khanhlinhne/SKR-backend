const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const expertRepository = require("../repositories/expert.repository");
const dashboardRepository = require("../repositories/dashboard.repository");
const expertDto = require("../dtos/expert.dto");

async function userIsAdmin(userId) {
  if (!userId) return false;
  const roles = await prisma.mst_user_roles.findMany({
    where: {
      user_id: userId,
      is_active: true,
      OR: [{ expires_at_utc: null }, { expires_at_utc: { gt: new Date() } }],
    },
    include: { mst_roles: true },
  });
  return roles.some((ur) => ur.mst_roles?.is_active && ur.mst_roles?.role_code === "admin");
}

async function ensureCreatorRole(userId, staffUserId) {
  const creatorRole = await prisma.mst_roles.findFirst({
    where: { role_code: "creator", is_active: true },
  });
  if (!creatorRole) return;

  const existing = await prisma.mst_user_roles.findFirst({
    where: {
      user_id: userId,
      role_id: creatorRole.role_id,
      is_active: true,
    },
  });
  if (existing) return;

  await prisma.mst_user_roles.create({
    data: {
      user_id: userId,
      role_id: creatorRole.role_id,
      created_by: staffUserId,
      is_active: true,
    },
  });
}

function num(d) {
  if (d === null || d === undefined) return 0;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  if (p === 0) return c > 0 ? 100 : 0;
  return round1(((c - p) / p) * 100);
}

function getComparableRanges(period) {
  const now = new Date();
  let currentStart;
  if (period === "week") {
    const d = new Date(now);
    const day = (d.getUTCDay() + 6) % 7;
    currentStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  } else if (period === "year") {
    currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  } else {
    currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const msCurrent = now.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(currentStart.getTime() - msCurrent);

  return {
    currentStart,
    currentEnd: now,
    previousStart,
    previousEnd,
  };
}

function buildLast12MonthBuckets() {
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      total: 0,
    });
  }
  return buckets;
}

function mergeMonthlyStudentLogins(buckets, rows) {
  const key = (year, month) => `${year}-${month}`;
  const map = new Map();
  for (const b of buckets) map.set(key(b.year, b.month), b);

  for (const row of rows || []) {
    const bucket = map.get(key(row.year, row.month));
    if (bucket) bucket.total = Number(row.total) || 0;
  }

  return buckets.map((bucket, index) => ({
    year: bucket.year,
    month: bucket.month,
    label: `T${index + 1}`,
    total: bucket.total,
  }));
}

function toDateMs(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function isWithin(dateInput, startUtc, endUtc) {
  const ms = toDateMs(dateInput);
  return ms >= startUtc.getTime() && ms <= endUtc.getTime();
}

function addDays(dateInput, days) {
  return new Date(new Date(dateInput).getTime() + days * 86_400_000);
}

function buildPeriodBuckets(period, startUtc, endUtc) {
  if (period === "week") {
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return labels.map((label, index) => {
      const start = addDays(startUtc, index);
      return {
        label,
        start,
        end: addDays(start, 1),
        total: 0,
        users: new Set(),
      };
    });
  }

  if (period === "year") {
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(Date.UTC(startUtc.getUTCFullYear(), index, 1));
      const end = new Date(Date.UTC(startUtc.getUTCFullYear(), index + 1, 1));
      return {
        label: `T${index + 1}`,
        start,
        end,
        total: 0,
        users: new Set(),
      };
    });
  }

  const buckets = [];
  let cursor = new Date(startUtc);
  let index = 1;
  while (cursor <= endUtc) {
    const next = new Date(Math.min(addDays(cursor, 7).getTime(), endUtc.getTime() + 1));
    buckets.push({
      label: `Tuần ${index}`,
      start: cursor,
      end: next,
      total: 0,
      users: new Set(),
    });
    cursor = next;
    index += 1;
  }
  return buckets;
}

function bucketizeUniqueLearners(enrollments, buckets, getDate) {
  for (const enrollment of enrollments) {
    const timestamp = getDate(enrollment);
    if (!timestamp) continue;

    const bucket = buckets.find(
      (entry) => toDateMs(timestamp) >= entry.start.getTime() && toDateMs(timestamp) < entry.end.getTime()
    );
    if (bucket && enrollment.user_id) {
      bucket.users.add(enrollment.user_id);
      bucket.total = bucket.users.size;
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    total: bucket.total,
    count: bucket.total,
  }));
}

function buildMonthlyNewLearners(enrollments) {
  const buckets = buildLast12MonthBuckets();
  const map = new Map(buckets.map((bucket) => [`${bucket.year}-${bucket.month}`, { ...bucket, users: new Set() }]));

  for (const enrollment of enrollments) {
    const date = enrollment.purchased_at_utc ? new Date(enrollment.purchased_at_utc) : null;
    if (!date || Number.isNaN(date.getTime())) continue;

    const bucket = map.get(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`);
    if (bucket && enrollment.user_id) {
      bucket.users.add(enrollment.user_id);
      bucket.total = bucket.users.size;
    }
  }

  return buckets.map((bucket, index) => {
    const entry = map.get(`${bucket.year}-${bucket.month}`);
    return {
      year: bucket.year,
      month: bucket.month,
      label: `T${index + 1}`,
      total: entry?.total || 0,
    };
  });
}

function progressOf(enrollment) {
  return Math.min(100, Math.max(0, num(enrollment.progress_percent)));
}

function isCompletedEnrollment(enrollment) {
  return progressOf(enrollment) >= 100 || Boolean(enrollment.completed_at_utc);
}

function isActiveEnrollment(enrollment) {
  const progress = progressOf(enrollment);
  return progress > 0 && progress < 100 && String(enrollment.status || "active") === "active";
}

function countUnique(enrollments, predicate = () => true) {
  return new Set(enrollments.filter(predicate).map((item) => item.user_id).filter(Boolean)).size;
}

function getLearnerName(user) {
  return user?.full_name || user?.display_name || user?.email || null;
}

function getEnrollmentActivityAt(enrollment) {
  return (
    enrollment.last_accessed_at_utc ||
    enrollment.mst_users?.last_login_at_utc ||
    enrollment.completed_at_utc ||
    enrollment.purchased_at_utc
  );
}

function compactText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function buildContentLocation(item) {
  const parts = [];
  if (item?.courseName) parts.push(item.courseName);
  if (item?.chapterName) parts.push(item.chapterName);
  if (item?.lessonName) parts.push(item.lessonName);
  return parts.length ? parts.join(" / ") : null;
}

function decorateDocumentItem(row) {
  const metricValue = Number(row.interactionCount ?? 0);
  return {
    ...row,
    title: row.documentTitle || "Tài liệu",
    subtitle: buildContentLocation(row),
    locationLabel: buildContentLocation(row),
    metricValue,
    metricLabel: "lượt mở/tải",
    count: metricValue,
  };
}

function decorateFlashcardItem(row) {
  const reviewCount = Number(row.reviewCount || 0);
  const studySessionCount = Number(row.studySessionCount || 0);
  const timesStudied = Number(row.timesStudied || 0);
  const metricValue = Math.max(timesStudied, studySessionCount, reviewCount);
  return {
    ...row,
    title: row.setTitle || "Bộ flashcard",
    subtitle: buildContentLocation(row),
    locationLabel: buildContentLocation(row),
    metricValue,
    metricLabel: reviewCount > 0 ? "lượt ôn thẻ" : studySessionCount > 0 ? "phiên học" : "lượt học",
    count: metricValue,
  };
}

function decorateQuestionItem(row, metricMode = "answers") {
  const answerCount = Number(row.answerCount || 0);
  const incorrectCount = Number(row.incorrectCount || 0);
  const timesUsed = Number(row.timesUsed || 0);
  const metricValue = metricMode === "incorrect" ? incorrectCount : Math.max(timesUsed, answerCount);
  return {
    ...row,
    title: compactText(row.questionText, 120) || "Câu hỏi",
    subtitle: buildContentLocation(row),
    locationLabel: buildContentLocation(row),
    metricValue,
    metricLabel: metricMode === "incorrect" ? "lượt sai" : "lượt làm",
    count: metricValue,
  };
}

function buildLearnerRollups(enrollments, now = new Date()) {
  const byUser = new Map();
  for (const enrollment of enrollments) {
    if (!enrollment.user_id) continue;
    const existing = byUser.get(enrollment.user_id) || {
      userId: enrollment.user_id,
      fullName: getLearnerName(enrollment.mst_users),
      email: enrollment.mst_users?.email || null,
      avatarUrl: enrollment.mst_users?.avatar_url || null,
      courseCount: 0,
      lessonsCompleted: 0,
      progressTotal: 0,
      completedCourses: 0,
      lastActivityAt: null,
    };

    existing.courseCount += 1;
    existing.lessonsCompleted += Number(enrollment.lessons_completed || 0);
    existing.progressTotal += progressOf(enrollment);
    if (isCompletedEnrollment(enrollment)) existing.completedCourses += 1;

    const activityAt = getEnrollmentActivityAt(enrollment);
    if (toDateMs(activityAt) > toDateMs(existing.lastActivityAt)) {
      existing.lastActivityAt = activityAt;
    }

    byUser.set(enrollment.user_id, existing);
  }

  const learners = [...byUser.values()].map((learner) => ({
    ...learner,
    averageProgress: learner.courseCount ? round1(learner.progressTotal / learner.courseCount) : 0,
    inactiveDays: learner.lastActivityAt
      ? Math.max(0, Math.floor((now.getTime() - toDateMs(learner.lastActivityAt)) / 86_400_000))
      : null,
  }));

  return learners;
}

function buildLearnerOverview(enrollments, currentStart, currentEnd, previousStart, previousEnd, periodBuckets, now) {
  const learners = buildLearnerRollups(enrollments, now);
  const newLearners = countUnique(enrollments, (item) => isWithin(item.purchased_at_utc, currentStart, currentEnd));
  const previousNewLearners = countUnique(enrollments, (item) => isWithin(item.purchased_at_utc, previousStart, previousEnd));
  const activeLearners = countUnique(enrollments, isActiveEnrollment);
  const completedLearners = countUnique(enrollments, isCompletedEnrollment);
  const returningLearners = learners.filter(
    (learner) => learner.courseCount > 1 || (learner.completedCourses > 0 && learner.courseCount > learner.completedCourses)
  ).length;

  const inactiveBuckets = [7, 14, 30].map((days) => ({
    key: `inactive_${days}_days`,
    days,
    label: `Không hoạt động >= ${days} ngày`,
    description: "Số học viên không có hoạt động gần đây trong các khóa của bạn.",
    count: learners.filter((learner) => learner.inactiveDays === null || learner.inactiveDays >= days).length,
  })).map((bucket) => ({
    ...bucket,
    metricValue: bucket.count,
    metricLabel: "học viên",
  }));

  const topActiveLearners = learners
    .sort((left, right) => {
      if (right.lessonsCompleted !== left.lessonsCompleted) return right.lessonsCompleted - left.lessonsCompleted;
      return toDateMs(right.lastActivityAt) - toDateMs(left.lastActivityAt);
    })
    .slice(0, 5)
    .map((learner) => {
      const activityCount = Number(learner.lessonsCompleted || 0) > 0
        ? Number(learner.lessonsCompleted || 0)
        : Number(learner.courseCount || 0);
      return {
        ...learner,
        title: learner.fullName || learner.email || "Học viên",
        subtitle: `${learner.averageProgress}% tiến độ trung bình`,
        activityCount,
        count: activityCount,
        metricValue: activityCount,
        metricLabel: Number(learner.lessonsCompleted || 0) > 0 ? "bài hoàn thành" : "khóa đang học",
      };
    });

  const needsAttention = enrollments
    .filter((enrollment) => {
      const progress = progressOf(enrollment);
      const activityAt = getEnrollmentActivityAt(enrollment);
      const inactiveDays = activityAt
        ? Math.floor((now.getTime() - toDateMs(activityAt)) / 86_400_000)
        : 999;
      return progress === 0 || (progress < 25 && inactiveDays >= 14);
    })
    .sort((left, right) => progressOf(left) - progressOf(right) || toDateMs(left.last_accessed_at_utc) - toDateMs(right.last_accessed_at_utc))
    .slice(0, 8)
    .map((enrollment) => ({
      learnerId: enrollment.user_id,
      fullName: getLearnerName(enrollment.mst_users),
      email: enrollment.mst_users?.email || null,
      avatarUrl: enrollment.mst_users?.avatar_url || null,
      courseId: enrollment.course_id,
      courseName: enrollment.mst_courses?.course_name || null,
      progress: progressOf(enrollment),
      lastActivityAt: getEnrollmentActivityAt(enrollment),
      reason: progressOf(enrollment) === 0 ? "not_started" : "low_progress_inactive",
    }));

  return {
    totalUniqueLearners: learners.length,
    newLearners,
    newLearnersChangePercent: pctChange(newLearners, previousNewLearners),
    activeLearners,
    completedLearners,
    returningLearners,
    inactiveBuckets,
    newLearnerSeries: bucketizeUniqueLearners(enrollments, periodBuckets, (item) => item.purchased_at_utc),
    topActiveLearners,
    learnersNeedingAttention: needsAttention,
  };
}

function buildProgressDistribution(enrollments) {
  const buckets = [
    { key: "notStarted", label: "0%", min: 0, max: 0 },
    { key: "p1_25", label: "1-25%", min: 1, max: 25 },
    { key: "p26_50", label: "26-50%", min: 26, max: 50 },
    { key: "p51_75", label: "51-75%", min: 51, max: 75 },
    { key: "p76_99", label: "76-99%", min: 76, max: 99 },
    { key: "completed", label: "100%", min: 100, max: 100 },
  ].map((bucket) => ({ ...bucket, count: 0 }));

  for (const enrollment of enrollments) {
    const progress = progressOf(enrollment);
    const bucket = buckets.find((entry) => progress >= entry.min && progress <= entry.max);
    if (bucket) bucket.count += 1;
  }

  const total = enrollments.length;
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: bucket.count,
    percent: total ? round1((bucket.count / total) * 100) : 0,
  }));
}

function groupRows(rows, keyGetter, createInitial, applyRow) {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyGetter(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, createInitial(row));
    applyRow(map.get(key), row);
  }
  return [...map.values()];
}

function buildLearningProgress(enrollments, lessonProgressRows, videoProgressRows) {
  const averageProgress = enrollments.length
    ? round1(enrollments.reduce((sum, item) => sum + progressOf(item), 0) / enrollments.length)
    : 0;
  const completedEnrollments = enrollments.filter(isCompletedEnrollment).length;
  const completionRate = enrollments.length ? round1((completedEnrollments / enrollments.length) * 100) : 0;
  const completedLessonCount = (lessonProgressRows || []).filter((row) => row.completed).length;
  const totalVideoWatchSeconds = (videoProgressRows || []).reduce(
    (sum, row) => sum + Number(row.watchDurationSeconds || 0),
    0
  );

  const topLessons = groupRows(
    lessonProgressRows,
    (row) => row.lessonId,
    (row) => ({
      lessonId: row.lessonId,
      lessonName: row.lessonName,
      chapterId: row.chapterId,
      chapterName: row.chapterName,
      courseId: row.courseId,
      courseName: row.courseName,
      learnerIds: new Set(),
      completedCount: 0,
    }),
    (entry, row) => {
      if (row.userId) entry.learnerIds.add(row.userId);
      if (row.completed) entry.completedCount += 1;
    }
  )
    .map((entry) => ({
      lessonId: entry.lessonId,
      lessonName: entry.lessonName,
      chapterId: entry.chapterId,
      chapterName: entry.chapterName,
      courseId: entry.courseId,
      courseName: entry.courseName,
      learnerCount: entry.learnerIds.size,
      completedCount: entry.completedCount,
    }))
    .sort((left, right) => right.learnerCount - left.learnerCount || right.completedCount - left.completedCount)
    .slice(0, 5);

  const dropOffPoints = topLessons
    .map((lesson) => ({
      ...lesson,
      dropOffCount: Math.max(0, lesson.learnerCount - lesson.completedCount),
      dropOffRate: lesson.learnerCount ? round1(((lesson.learnerCount - lesson.completedCount) / lesson.learnerCount) * 100) : 0,
    }))
    .sort((left, right) => right.dropOffRate - left.dropOffRate || right.dropOffCount - left.dropOffCount)
    .slice(0, 5);

  const topVideos = groupRows(
    videoProgressRows,
    (row) => row.videoId,
    (row) => ({
      videoId: row.videoId,
      videoTitle: row.videoTitle,
      courseId: row.courseId,
      courseName: row.courseName,
      learnerIds: new Set(),
      watchCount: 0,
      completionTotal: 0,
      progressRows: 0,
      totalWatchSeconds: 0,
    }),
    (entry, row) => {
      if (row.userId) entry.learnerIds.add(row.userId);
      entry.watchCount += Number(row.watchCount || 0);
      entry.completionTotal += Number(row.completionPercentage || 0);
      entry.progressRows += 1;
      entry.totalWatchSeconds += Number(row.watchDurationSeconds || 0);
    }
  )
    .map((entry) => ({
      videoId: entry.videoId,
      videoTitle: entry.videoTitle,
      courseId: entry.courseId,
      courseName: entry.courseName,
      learnerCount: entry.learnerIds.size,
      watchCount: entry.watchCount,
      averageCompletion: entry.progressRows ? round1(entry.completionTotal / entry.progressRows) : 0,
      totalWatchSeconds: entry.totalWatchSeconds,
    }))
    .sort((left, right) => right.learnerCount - left.learnerCount || right.watchCount - left.watchCount)
    .slice(0, 5);

  return {
    averageProgress,
    completionRate,
    completedEnrollments,
    totalEnrollments: enrollments.length,
    progressDistribution: buildProgressDistribution(enrollments),
    completedLessonCount,
    totalVideoWatchSeconds,
    totalVideoWatchMinutes: round1(totalVideoWatchSeconds / 60),
    topLessons,
    topVideos,
    dropOffPoints,
  };
}

function getMissingContentTypes(course) {
  const missing = [];
  if (!course.videoCount) missing.push("videos");
  if (!course.documentCount) missing.push("documents");
  if (!course.questionCount) missing.push("questions");
  if (!course.flashcardCount) missing.push("flashcards");
  return missing;
}

function buildCourseStatus(courseStatusSummary, courseHealthRows) {
  const courses = (courseHealthRows || []).map((course) => ({
    ...course,
    missingContentTypes: getMissingContentTypes(course),
  }));

  return {
    summary: {
      total: Number(courseStatusSummary.total || 0),
      published: Number(courseStatusSummary.published || 0),
      draft: Number(courseStatusSummary.draft || 0),
      inactive: Number(courseStatusSummary.inactive || 0),
    },
    missingContentCourses: courses.filter((course) => course.missingContentTypes.length > 0).slice(0, 8),
    noStudentCourses: courses.filter((course) => Number(course.studentCount || 0) === 0).slice(0, 8),
    lowRatedCourses: courses
      .filter((course) => Number(course.ratingCount || 0) > 0 && Number(course.ratingAverage || 0) < 4)
      .sort((left, right) => Number(left.ratingAverage || 0) - Number(right.ratingAverage || 0))
      .slice(0, 8),
    mostStudiedCourses: [...courses]
      .sort((left, right) => Number(right.studentCount || 0) - Number(left.studentCount || 0))
      .slice(0, 5),
    bestCompletionCourses: courses
      .filter((course) => Number(course.studentCount || 0) > 0)
      .sort((left, right) => Number(right.completionRate || 0) - Number(left.completionRate || 0))
      .slice(0, 5),
  };
}

function buildContentQuality(contentStatsRows, lowCompletionVideos, topDocuments, topFlashcards, topQuestions, weakQuestions) {
  const byType = new Map((contentStatsRows || []).map((row) => [row.type, row]));
  const getRow = (type) => byType.get(type) || { total: 0, newInPeriod: 0, pending: 0 };
  const videos = getRow("videos");
  const documents = getRow("documents");
  const questions = getRow("questions");
  const flashcards = getRow("flashcards");
  const totalContentItems =
    Number(videos.total || 0) + Number(documents.total || 0) + Number(questions.total || 0) + Number(flashcards.total || 0);

  return {
    totals: {
      videos: Number(videos.total || 0),
      documents: Number(documents.total || 0),
      questions: Number(questions.total || 0),
      flashcards: Number(flashcards.total || 0),
      total: totalContentItems,
    },
    newInPeriod: {
      videos: Number(videos.newInPeriod || 0),
      documents: Number(documents.newInPeriod || 0),
      questions: Number(questions.newInPeriod || 0),
      flashcards: Number(flashcards.newInPeriod || 0),
      total:
        Number(videos.newInPeriod || 0) +
        Number(documents.newInPeriod || 0) +
        Number(questions.newInPeriod || 0) +
        Number(flashcards.newInPeriod || 0),
    },
    pending: {
      videos: Number(videos.pending || 0),
      documents: Number(documents.pending || 0),
      questions: Number(questions.pending || 0),
      flashcards: Number(flashcards.pending || 0),
      total:
        Number(videos.pending || 0) +
        Number(documents.pending || 0) +
        Number(questions.pending || 0) +
        Number(flashcards.pending || 0),
    },
    lowCompletionVideos,
    topDocuments: (topDocuments || []).map(decorateDocumentItem),
    topFlashcards: (topFlashcards || []).map(decorateFlashcardItem),
    topQuestions: (topQuestions || []).map((row) => decorateQuestionItem(row, "answers")),
    weakQuestions: (weakQuestions || []).map((row) => decorateQuestionItem(row, "incorrect")),
  };
}

function buildQuizOverview(questionTypeRows, questionDifficultyRows, quizStats, missedQuestions) {
  const totalQuestions = (questionTypeRows || []).reduce((sum, row) => sum + Number(row.count || 0), 0);
  return {
    totalQuestions,
    questionTypeBreakdown: questionTypeRows || [],
    difficultyBreakdown: questionDifficultyRows || [],
    totalAttempts: Number(quizStats?.totalAttempts || 0),
    averageScore: quizStats?.averageScore == null ? null : round1(quizStats.averageScore),
    passedAttempts: Number(quizStats?.passedAttempts || 0),
    passRate: quizStats?.passRate == null ? 0 : round1(quizStats.passRate),
    mostMissedQuestions: (missedQuestions || []).map((row) => decorateQuestionItem(row, "incorrect")),
  };
}

const expertService = {
  async getMyDashboardLegacy(userId, period = "month") {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const currentPeriod = period === "week" || period === "year" ? period : "month";
    const { currentStart, currentEnd, previousStart, previousEnd } = getComparableRanges(currentPeriod);
    const chartStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1)
    );

    const [
      totalCourses,
      totalStudents,
      revenueCurrent,
      revenuePrevious,
      ratingSummary,
      monthlyStudentLoginsRaw,
      topCoursesRaw,
    ] = await Promise.all([
      dashboardRepository.countCoursesByCreator(userId, { status: "published" }),
      dashboardRepository.countActiveStudentsByCreator(userId),
      dashboardRepository.sumPurchaseRevenueByCreator(userId, currentStart, currentEnd),
      dashboardRepository.sumPurchaseRevenueByCreator(userId, previousStart, previousEnd),
      dashboardRepository.getCourseRatingSummaryByCreator(userId),
      dashboardRepository.getMonthlyStudentLoginsByCreator(userId, chartStart, currentEnd),
      dashboardRepository.getTopCoursesByCreator(userId, 5),
    ]);

    const revenueChange = pctChange(num(revenueCurrent), num(revenuePrevious));
    const monthlyStudentLogins = mergeMonthlyStudentLogins(
      buildLast12MonthBuckets(),
      monthlyStudentLoginsRaw
    );

    const topCourses = topCoursesRaw.map((row) => ({
      rank: row.rank,
      courseId: row.courseId,
      courseName: row.course?.course_name || null,
      courseCode: row.course?.course_code || null,
      studentCount: row.studentCount || 0,
      revenue: Math.round(num(row.revenue)),
      rating: row.course?.rating_average != null ? round1(num(row.course.rating_average)) : null,
    }));

    return {
      period: currentPeriod,
      periodBounds: {
        currentStartUtc: currentStart,
        currentEndUtc: currentEnd,
        previousStartUtc: previousStart,
        previousEndUtc: previousEnd,
      },
      summary: {
        courses: {
          total: totalCourses,
        },
        students: {
          total: totalStudents,
        },
        revenue: {
          totalInPeriod: Math.round(num(revenueCurrent)),
          currencyCode: "VND",
          changePercent: revenueChange,
        },
        rating: {
          average: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
          ratedCourseCount: ratingSummary.ratedCourseCount,
        },
      },
      studentLoginsByMonth: monthlyStudentLogins,
      topCourses,
      ui: {
        page: {
          sectionTitle: "Tổng quan",
          sectionSubtitle: "Theo dõi khóa học và người học của bạn",
        },
        summaryCards: [
          { key: "courses", title: "Khóa học", value: totalCourses },
          { key: "students", title: "Học viên", value: totalStudents },
          {
            key: "revenue",
            title: "Doanh thu",
            value: Math.round(num(revenueCurrent)),
            currencyCode: "VND",
            changePercent: revenueChange,
          },
          {
            key: "rating",
            title: "Đánh giá",
            value: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
          },
        ],
        studentLoginChart: {
          title: "Biểu đồ Học viên đăng nhập",
          subtitle: "Số học viên đăng nhập theo tháng",
          legendLabel: "Học viên đăng nhập",
          points: monthlyStudentLogins,
        },
        myCourses: {
          title: "Khóa học của tôi",
          items: topCourses,
        },
      },
    };
  },

  async getMyDashboard(userId, period = "month") {
    if (!userId) throw AppError.unauthorized("Authentication required.");

    const now = new Date();
    const currentPeriod = period === "week" || period === "year" ? period : "month";
    const { currentStart, currentEnd, previousStart, previousEnd } = getComparableRanges(currentPeriod);

    const [
      courseStatusSummary,
      enrollments,
      ratingSummary,
      courseHealthRows,
      lessonProgressRows,
      videoProgressRows,
      contentStatsRows,
      lowCompletionVideos,
      topDocuments,
      topFlashcards,
      topQuestions,
      questionTypeRows,
      questionDifficultyRows,
      quizStats,
      missedQuestions,
    ] = await Promise.all([
      dashboardRepository.getCreatorCourseStatusSummary(userId),
      dashboardRepository.findCreatorEnrollmentsDetailed(userId),
      dashboardRepository.getCourseRatingSummaryByCreator(userId),
      dashboardRepository.getCreatorCourseHealth(userId, 100),
      dashboardRepository.findCreatorLessonProgressRows(userId),
      dashboardRepository.findCreatorVideoProgressRows(userId),
      dashboardRepository.getContentStatsByCreator(userId, currentStart, currentEnd),
      dashboardRepository.findLowCompletionVideosByCreator(userId, 5),
      dashboardRepository.findTopDocumentsByCreator(userId, 5),
      dashboardRepository.findTopFlashcardsByCreator(userId, 5),
      dashboardRepository.findTopQuestionsByCreator(userId, 5),
      dashboardRepository.getQuestionTypeBreakdownByCreator(userId),
      dashboardRepository.getQuestionDifficultyBreakdownByCreator(userId),
      dashboardRepository.getQuizAttemptStatsByCreator(userId),
      dashboardRepository.findMostMissedQuestionsByCreator(userId, 5),
    ]);

    const courseStatus = buildCourseStatus(courseStatusSummary, courseHealthRows);
    const learnerOverview = buildLearnerOverview(
      enrollments,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      buildPeriodBuckets(currentPeriod, currentStart, currentEnd),
      now
    );
    const learningProgress = buildLearningProgress(enrollments, lessonProgressRows, videoProgressRows);
    const contentQuality = buildContentQuality(
      contentStatsRows,
      lowCompletionVideos,
      topDocuments,
      topFlashcards,
      topQuestions,
      missedQuestions
    );
    const quizOverview = buildQuizOverview(questionTypeRows, questionDifficultyRows, quizStats, missedQuestions);
    const monthlyStudentLogins = buildMonthlyNewLearners(enrollments);
    const totalRatingCount = (courseHealthRows || []).reduce((sum, row) => sum + Number(row.ratingCount || 0), 0);

    const topCourses = courseStatus.mostStudiedCourses.map((row, index) => ({
      rank: index + 1,
      courseId: row.courseId,
      courseName: row.courseName || null,
      courseCode: row.courseCode || null,
      studentCount: row.studentCount || 0,
      revenue: 0,
      rating: row.ratingAverage != null ? round1(num(row.ratingAverage)) : null,
      completionRate: row.completionRate || 0,
    }));

    return {
      period: currentPeriod,
      periodBounds: {
        currentStartUtc: currentStart,
        currentEndUtc: currentEnd,
        previousStartUtc: previousStart,
        previousEndUtc: previousEnd,
      },
      summary: {
        courses: {
          total: courseStatus.summary.total,
          published: courseStatus.summary.published,
          draft: courseStatus.summary.draft,
          inactive: courseStatus.summary.inactive,
        },
        students: {
          total: learnerOverview.totalUniqueLearners,
          newInPeriod: learnerOverview.newLearners,
          active: learnerOverview.activeLearners,
          completed: learnerOverview.completedLearners,
        },
        revenue: {
          totalInPeriod: 0,
          currencyCode: "VND",
          changePercent: null,
          deprecated: true,
        },
        rating: {
          average: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
          ratedCourseCount: ratingSummary.ratedCourseCount,
          totalRatingCount,
        },
        content: {
          totalItems: contentQuality.totals.total,
          newInPeriod: contentQuality.newInPeriod.total,
          pending: contentQuality.pending.total,
        },
      },
      studentLoginsByMonth: monthlyStudentLogins,
      topCourses,
      courseStatus,
      learnerOverview,
      learningProgress,
      contentQuality,
      quizOverview,
      learnerActivitySeries: learnerOverview.newLearnerSeries,
      progressDistribution: learningProgress.progressDistribution,
      ui: {
        page: {
          sectionTitle: "Tá»•ng quan",
          sectionSubtitle: "Theo dÃµi khÃ³a há»c, há»c viÃªn vÃ  cháº¥t lÆ°á»£ng ná»™i dung cá»§a báº¡n",
        },
        summaryCards: [
          {
            key: "courses",
            title: "KhÃ³a há»c",
            value: courseStatus.summary.total,
            subtitle: `${courseStatus.summary.published} published / ${courseStatus.summary.draft} draft`,
          },
          {
            key: "students",
            title: "Há»c viÃªn",
            value: learnerOverview.totalUniqueLearners,
            subtitle: `${learnerOverview.newLearners} há»c viÃªn má»›i trong ká»³`,
          },
          {
            key: "activeLearners",
            title: "Äang há»c",
            value: learnerOverview.activeLearners,
            subtitle: "Progress > 0 vÃ  chÆ°a hoÃ n thÃ nh",
          },
          {
            key: "completedLearners",
            title: "HoÃ n thÃ nh",
            value: learnerOverview.completedLearners,
            subtitle: `${learningProgress.completionRate}% lá»‡ hoÃ n thÃ nh`,
          },
          {
            key: "rating",
            title: "ÄÃ¡nh giÃ¡",
            value: ratingSummary.average != null ? round1(num(ratingSummary.average)) : null,
            subtitle: `${totalRatingCount} lÆ°á»£t Ä‘Ã¡nh giÃ¡`,
          },
          {
            key: "content",
            title: "Ná»™i dung",
            value: contentQuality.totals.total,
            subtitle: `${contentQuality.newInPeriod.total} má»›i trong ká»³`,
          },
        ],
        studentLoginChart: {
          title: "Biá»ƒu Ä‘á»“ há»c viÃªn má»›i",
          subtitle: "Sá»‘ há»c viÃªn má»›i theo ká»³",
          legendLabel: "Há»c viÃªn má»›i",
          points: learnerOverview.newLearnerSeries,
          monthlyPoints: monthlyStudentLogins,
        },
        myCourses: {
          title: "KhÃ³a há»c ná»•i báº­t",
          items: topCourses,
        },
        courseStatus,
        learnerOverview,
        learningProgress,
        contentQuality,
        quizOverview,
      },
    };
  },

  async listExperts(query, { isAdmin = false } = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const includeInactive = isAdmin && query.includeInactive === "true";

    const where = {};
    if (!includeInactive) {
      where.is_active = true;
      where.status = "active";
    }

    if (query.search) {
      where.OR = [
        { headline: { contains: query.search, mode: "insensitive" } },
        { expertise_summary: { contains: query.search, mode: "insensitive" } },
        { mst_users: { full_name: { contains: query.search, mode: "insensitive" } } },
        { mst_users: { display_name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const { items, totalItems } = await expertRepository.findMany({
      where,
      orderBy: [{ display_order: "asc" }, { created_at_utc: "desc" }],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(expertDto.toListItem),
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

  async getExpertDetail(expertId, { isAdmin = false } = {}) {
    const row = await expertRepository.findById(expertId);
    if (!row) throw AppError.notFound("Expert not found");
    if (!isAdmin && (!row.is_active || row.status !== "active")) {
      throw AppError.notFound("Expert not found");
    }
    return expertDto.toDetail(row);
  },

  async createExpert(body, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const user = await prisma.mst_users.findUnique({
      where: { user_id: body.userId },
    });
    if (!user || !user.is_active) throw AppError.notFound("User not found or inactive");

    const dup = await expertRepository.findByUserId(body.userId);
    if (dup) throw AppError.conflict("This user already has an expert profile");

    if (body.subjectCourseIds?.length) {
      const count = await prisma.mst_courses.count({
        where: { course_id: { in: body.subjectCourseIds }, is_active: true },
      });
      if (count !== body.subjectCourseIds.length) {
        throw AppError.badRequest("One or more subjectCourseIds are invalid");
      }
    }

    if (body.assignCreatorRole !== false) {
      await ensureCreatorRole(body.userId, staffUserId);
    }

    const created = await expertRepository.create({
      userId: body.userId,
      headline: body.headline,
      expertiseSummary: body.expertiseSummary,
      subjectCourseIds: body.subjectCourseIds ?? null,
      displayOrder: body.displayOrder,
      status: "active",
      createdBy: staffUserId,
    });

    return expertDto.toDetail(created);
  },

  async updateExpert(expertId, body, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const existing = await expertRepository.findById(expertId);
    if (!existing) throw AppError.notFound("Expert not found");

    if (body.subjectCourseIds?.length) {
      const count = await prisma.mst_courses.count({
        where: { course_id: { in: body.subjectCourseIds }, is_active: true },
      });
      if (count !== body.subjectCourseIds.length) {
        throw AppError.badRequest("One or more subjectCourseIds are invalid");
      }
    }

    const updated = await expertRepository.update(expertId, {
      headline: body.headline,
      expertiseSummary: body.expertiseSummary,
      subjectCourseIds: body.subjectCourseIds,
      displayOrder: body.displayOrder,
      status: body.status,
      updatedBy: staffUserId,
    });

    return expertDto.toDetail(updated);
  },

  async deleteExpert(expertId, staffUserId) {
    if (!staffUserId) throw AppError.unauthorized("Authentication required.");

    const existing = await expertRepository.findById(expertId);
    if (!existing) throw AppError.notFound("Expert not found");

    await expertRepository.update(expertId, {
      isActive: false,
      status: "inactive",
      updatedBy: staffUserId,
    });

    return { deleted: true, expertId };
  },
};

module.exports = { expertService, userIsAdmin };
