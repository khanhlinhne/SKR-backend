const prisma = require("../config/prisma");

const dashboardRepository = {
  async countUsers(where) {
    return prisma.mst_users.count({ where });
  },

  async countCourses(where) {
    return prisma.mst_courses.count({ where });
  },

  async countOrders(where) {
    return prisma.pmt_orders.count({ where });
  },

  async sumOrderRevenue(where) {
    const r = await prisma.pmt_orders.aggregate({
      where,
      _sum: { total_amount: true },
    });
    return r._sum.total_amount;
  },

  /**
   * Monthly revenue (completed orders) between start and end (inclusive upper bound by day).
   */
  async getMonthlyRevenueSeries(startUtc, endUtc) {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM paid_at_utc)::int AS year,
        EXTRACT(MONTH FROM paid_at_utc)::int AS month,
        COALESCE(SUM(total_amount), 0)::float8 AS total
      FROM pmt_orders
      WHERE payment_status = 'completed'
        AND paid_at_utc IS NOT NULL
        AND paid_at_utc >= ${startUtc}
        AND paid_at_utc <= ${endUtc}
      GROUP BY EXTRACT(YEAR FROM paid_at_utc), EXTRACT(MONTH FROM paid_at_utc)
      ORDER BY year ASC, month ASC
    `;
    return rows;
  },

  async getTopCoursesByPurchaseRevenue(take = 4) {
    const grouped = await prisma.pmt_course_purchases.groupBy({
      by: ["course_id"],
      where: { status: "active" },
      _sum: { purchase_price: true },
      _count: { _all: true },
      orderBy: { _sum: { purchase_price: "desc" } },
      take,
    });
    if (!grouped.length) return [];

    const courseIds = grouped.map((g) => g.course_id);
    const courses = await prisma.mst_courses.findMany({
      where: { course_id: { in: courseIds } },
      select: {
        course_id: true,
        course_name: true,
        course_code: true,
        rating_average: true,
        rating_count: true,
        purchase_count: true,
      },
    });
    const byId = new Map(courses.map((c) => [c.course_id, c]));

    return grouped.map((g, index) => ({
      rank: index + 1,
      courseId: g.course_id,
      course: byId.get(g.course_id) || null,
      studentCount: g._count._all,
      revenue: g._sum.purchase_price,
    }));
  },

  async countCoursesByCreator(creatorId, where = {}) {
    return prisma.mst_courses.count({
      where: {
        creator_id: creatorId,
        is_active: true,
        ...where,
      },
    });
  },

  async countActiveStudentsByCreator(creatorId) {
    const rows = await prisma.pmt_course_purchases.groupBy({
      by: ["user_id"],
      where: {
        status: "active",
        mst_courses: {
          creator_id: creatorId,
          is_active: true,
        },
      },
    });

    return rows.length;
  },

  async sumPurchaseRevenueByCreator(creatorId, startUtc, endUtc) {
    const result = await prisma.pmt_course_purchases.aggregate({
      where: {
        status: "active",
        purchased_at_utc: { gte: startUtc, lte: endUtc },
        mst_courses: {
          creator_id: creatorId,
          is_active: true,
        },
      },
      _sum: { purchase_price: true },
    });

    return result._sum.purchase_price;
  },

  async getCourseRatingSummaryByCreator(creatorId) {
    const courses = await prisma.mst_courses.findMany({
      where: {
        creator_id: creatorId,
        is_active: true,
        rating_average: { not: null },
      },
      select: {
        rating_average: true,
        rating_count: true,
      },
    });

    let ratedCourseCount = 0;
    let weightedTotal = 0;
    let totalRatings = 0;

    for (const course of courses) {
      const ratingCount = Number(course.rating_count || 0);
      const ratingAverage = Number(course.rating_average || 0);

      if (ratingCount <= 0 || !Number.isFinite(ratingAverage)) {
        continue;
      }

      ratedCourseCount += 1;
      totalRatings += ratingCount;
      weightedTotal += ratingAverage * ratingCount;
    }

    return {
      average: totalRatings > 0 ? weightedTotal / totalRatings : null,
      ratedCourseCount,
    };
  },

  async getMonthlyStudentLoginsByCreator(creatorId, startUtc, endUtc) {
    return prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM u.last_login_at_utc)::int AS year,
        EXTRACT(MONTH FROM u.last_login_at_utc)::int AS month,
        COUNT(DISTINCT sp.user_id)::int AS total
      FROM pmt_subject_purchases sp
      INNER JOIN mst_subjects s
        ON s.subject_id = sp.subject_id
      INNER JOIN mst_users u
        ON u.user_id = sp.user_id
      WHERE s.creator_id = ${creatorId}::uuid
        AND COALESCE(s.is_active, true) = true
        AND COALESCE(sp.status, 'active') = 'active'
        AND u.last_login_at_utc IS NOT NULL
        AND u.last_login_at_utc >= ${startUtc}
        AND u.last_login_at_utc <= ${endUtc}
      GROUP BY EXTRACT(YEAR FROM u.last_login_at_utc), EXTRACT(MONTH FROM u.last_login_at_utc)
      ORDER BY year ASC, month ASC
    `;
  },

  async getTopCoursesByCreator(creatorId, take = 5) {
    const grouped = await prisma.pmt_course_purchases.groupBy({
      by: ["course_id"],
      where: {
        status: "active",
        mst_courses: {
          creator_id: creatorId,
          is_active: true,
        },
      },
      _sum: { purchase_price: true },
      _count: { _all: true },
      orderBy: { _sum: { purchase_price: "desc" } },
      take,
    });

    if (!grouped.length) {
      return [];
    }

    const courseIds = grouped.map((row) => row.course_id);
    const courses = await prisma.mst_courses.findMany({
      where: {
        course_id: { in: courseIds },
        creator_id: creatorId,
      },
      select: {
        course_id: true,
        course_name: true,
        course_code: true,
        rating_average: true,
      },
    });
    const byId = new Map(courses.map((course) => [course.course_id, course]));

    return grouped.map((row, index) => ({
      rank: index + 1,
      courseId: row.course_id,
      course: byId.get(row.course_id) || null,
      studentCount: row._count._all,
      revenue: row._sum.purchase_price,
    }));
  },

  /** Revenue in date range per course (for growth). */
  async sumPurchaseRevenueByCourse(courseId, startUtc, endUtc) {
    const r = await prisma.pmt_course_purchases.aggregate({
      where: {
        course_id: courseId,
        status: "active",
        purchased_at_utc: { gte: startUtc, lte: endUtc },
      },
      _sum: { purchase_price: true },
    });
    return r._sum.purchase_price;
  },

  async findCreatorEnrollmentsDetailed(creatorId) {
    return prisma.pmt_course_purchases.findMany({
      where: {
        mst_courses: {
          creator_id: creatorId,
        },
      },
      orderBy: [{ purchased_at_utc: "desc" }, { created_at_utc: "desc" }],
      select: {
        purchase_id: true,
        course_id: true,
        user_id: true,
        purchased_at_utc: true,
        progress_percent: true,
        lessons_completed: true,
        last_accessed_at_utc: true,
        completed_at_utc: true,
        user_rating: true,
        user_review: true,
        rated_at_utc: true,
        status: true,
        mst_courses: {
          select: {
            course_id: true,
            course_code: true,
            course_name: true,
            status: true,
            is_active: true,
          },
        },
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            email: true,
            avatar_url: true,
            last_login_at_utc: true,
          },
        },
      },
    });
  },

  async getCreatorCourseStatusSummary(creatorId) {
    const rows = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true AND status = 'published')::int AS "published",
        COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true AND status = 'draft')::int AS "draft",
        COUNT(*) FILTER (
          WHERE COALESCE(is_active, false) = false
             OR COALESCE(status, '') IN ('inactive', 'archived', 'deleted')
        )::int AS "inactive"
      FROM mst_subjects
      WHERE creator_id = ${creatorId}::uuid
    `;
    return rows[0] || { total: 0, published: 0, draft: 0, inactive: 0 };
  },

  async getCreatorCourseHealth(creatorId, take = 5) {
    return prisma.$queryRaw`
      WITH creator_courses AS (
        SELECT
          s.subject_id,
          s.subject_code,
          s.subject_name,
          s.status,
          s.is_active,
          s.rating_average,
          s.rating_count,
          s.total_lessons,
          s.total_videos,
          s.total_documents,
          s.total_questions
        FROM mst_subjects s
        WHERE s.creator_id = ${creatorId}::uuid
      ),
      enrollments AS (
        SELECT
          sp.subject_id,
          COUNT(*)::int AS student_count,
          COUNT(DISTINCT sp.user_id)::int AS unique_student_count,
          AVG(COALESCE(sp.progress_percent, 0))::float8 AS average_progress,
          COUNT(*) FILTER (
            WHERE COALESCE(sp.progress_percent, 0) >= 100 OR sp.completed_at_utc IS NOT NULL
          )::int AS completed_count
        FROM pmt_subject_purchases sp
        INNER JOIN creator_courses cc ON cc.subject_id = sp.subject_id
        WHERE COALESCE(sp.status, 'active') = 'active'
        GROUP BY sp.subject_id
      ),
      videos AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_videos
        WHERE subject_id IN (SELECT subject_id FROM creator_courses)
        GROUP BY subject_id
      ),
      documents AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_documents
        WHERE subject_id IN (SELECT subject_id FROM creator_courses)
        GROUP BY subject_id
      ),
      questions AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_questions
        WHERE subject_id IN (SELECT subject_id FROM creator_courses)
        GROUP BY subject_id
      ),
      flashcards AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_flashcards
        WHERE subject_id IN (SELECT subject_id FROM creator_courses)
        GROUP BY subject_id
      )
      SELECT
        cc.subject_id AS "courseId",
        cc.subject_code AS "courseCode",
        cc.subject_name AS "courseName",
        cc.status,
        COALESCE(cc.is_active, true) AS "isActive",
        COALESCE(cc.rating_average, 0)::float8 AS "ratingAverage",
        COALESCE(cc.rating_count, 0)::int AS "ratingCount",
        COALESCE(v.total, cc.total_videos, 0)::int AS "videoCount",
        COALESCE(d.total, cc.total_documents, 0)::int AS "documentCount",
        COALESCE(q.total, cc.total_questions, 0)::int AS "questionCount",
        COALESCE(f.total, 0)::int AS "flashcardCount",
        COALESCE(cc.total_lessons, 0)::int AS "lessonCount",
        COALESCE(e.student_count, 0)::int AS "studentCount",
        COALESCE(e.unique_student_count, 0)::int AS "uniqueStudentCount",
        COALESCE(e.average_progress, 0)::float8 AS "averageProgress",
        COALESCE(e.completed_count, 0)::int AS "completedCount",
        CASE
          WHEN COALESCE(e.student_count, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(e.completed_count, 0)::numeric / e.student_count) * 100, 1)::float8
        END AS "completionRate"
      FROM creator_courses cc
      LEFT JOIN enrollments e ON e.subject_id = cc.subject_id
      LEFT JOIN videos v ON v.subject_id = cc.subject_id
      LEFT JOIN documents d ON d.subject_id = cc.subject_id
      LEFT JOIN questions q ON q.subject_id = cc.subject_id
      LEFT JOIN flashcards f ON f.subject_id = cc.subject_id
      ORDER BY COALESCE(e.student_count, 0) DESC, cc.subject_name ASC
      LIMIT ${take * 10}
    `;
  },

  async findCreatorLessonProgressRows(creatorId) {
    return prisma.$queryRaw`
      SELECT
        lp.progress_id AS "progressId",
        lp.subject_id AS "courseId",
        s.subject_name AS "courseName",
        lp.user_id AS "userId",
        lp.lesson_id AS "lessonId",
        l.lesson_name AS "lessonName",
        lp.chapter_id AS "chapterId",
        c.chapter_name AS "chapterName",
        lp.completed,
        lp.completed_at_utc AS "completedAtUtc",
        lp.created_at_utc AS "createdAtUtc",
        lp.updated_at_utc AS "updatedAtUtc"
      FROM lrn_subject_lesson_progress lp
      INNER JOIN mst_subjects s ON s.subject_id = lp.subject_id
      LEFT JOIN mst_lessons l ON l.lesson_id = lp.lesson_id
      LEFT JOIN mst_chapters c ON c.chapter_id = lp.chapter_id
      WHERE s.creator_id = ${creatorId}::uuid
        AND COALESCE(lp.status, 'active') = 'active'
    `;
  },

  async findCreatorVideoProgressRows(creatorId) {
    return prisma.$queryRaw`
      SELECT
        vp.progress_id AS "progressId",
        vp.user_id AS "userId",
        vp.video_id AS "videoId",
        v.video_title AS "videoTitle",
        v.subject_id AS "courseId",
        s.subject_name AS "courseName",
        v.lesson_id AS "lessonId",
        vp.watch_duration_seconds AS "watchDurationSeconds",
        vp.total_duration_seconds AS "totalDurationSeconds",
        COALESCE(vp.completion_percentage, 0)::float8 AS "completionPercentage",
        COALESCE(vp.is_completed, false) AS "isCompleted",
        COALESCE(vp.watch_count, 0)::int AS "watchCount",
        vp.last_watched_at_utc AS "lastWatchedAtUtc",
        vp.created_at_utc AS "createdAtUtc",
        vp.updated_at_utc AS "updatedAtUtc"
      FROM lrn_video_progress vp
      INNER JOIN cnt_videos v ON v.video_id = vp.video_id
      INNER JOIN mst_subjects s ON s.subject_id = v.subject_id
      WHERE s.creator_id = ${creatorId}::uuid
    `;
  },

  async getContentStatsByCreator(creatorId, startUtc, endUtc) {
    return prisma.$queryRaw`
      SELECT *
      FROM (
        SELECT
          'videos' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE v.created_at_utc >= ${startUtc} AND v.created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(v.status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_videos v
        LEFT JOIN mst_subjects s ON s.subject_id = v.subject_id
        WHERE s.creator_id = ${creatorId}::uuid OR v.uploader_id = ${creatorId}::uuid

        UNION ALL

        SELECT
          'documents' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE d.created_at_utc >= ${startUtc} AND d.created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(d.status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_documents d
        LEFT JOIN mst_subjects s ON s.subject_id = d.subject_id
        WHERE s.creator_id = ${creatorId}::uuid OR d.uploader_id = ${creatorId}::uuid

        UNION ALL

        SELECT
          'questions' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE q.created_at_utc >= ${startUtc} AND q.created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(q.status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_questions q
        LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
        WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid

        UNION ALL

        SELECT
          'flashcards' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE f.created_at_utc >= ${startUtc} AND f.created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(f.status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_flashcards f
        LEFT JOIN mst_subjects s ON s.subject_id = f.subject_id
        WHERE s.creator_id = ${creatorId}::uuid OR f.creator_id = ${creatorId}::uuid
      ) content_stats
    `;
  },

  async findLowCompletionVideosByCreator(creatorId, take = 5) {
    return prisma.$queryRaw`
      SELECT
        v.video_id AS "videoId",
        v.video_title AS "videoTitle",
        v.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COUNT(vp.progress_id)::int AS "learnerCount",
        AVG(COALESCE(vp.completion_percentage, 0))::float8 AS "averageCompletion",
        SUM(COALESCE(vp.watch_duration_seconds, 0))::int AS "totalWatchSeconds"
      FROM cnt_videos v
      INNER JOIN mst_subjects s ON s.subject_id = v.subject_id
      LEFT JOIN lrn_video_progress vp ON vp.video_id = v.video_id
      WHERE s.creator_id = ${creatorId}::uuid
      GROUP BY v.video_id, v.video_title, v.subject_id, s.subject_name
      HAVING COUNT(vp.progress_id) > 0
      ORDER BY AVG(COALESCE(vp.completion_percentage, 0)) ASC, COUNT(vp.progress_id) DESC
      LIMIT ${take}
    `;
  },

  async findTopDocumentsByCreator(creatorId, take = 5) {
    return prisma.$queryRaw`
      SELECT
        d.document_id AS "documentId",
        d.document_title AS "documentTitle",
        d.lesson_id AS "lessonId",
        l.lesson_name AS "lessonName",
        l.chapter_id AS "chapterId",
        c.chapter_name AS "chapterName",
        d.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COALESCE(d.view_count, 0)::int AS "viewCount",
        COALESCE(d.download_count, 0)::int AS "downloadCount",
        (COALESCE(d.view_count, 0) + COALESCE(d.download_count, 0))::int AS "interactionCount"
      FROM cnt_documents d
      LEFT JOIN mst_subjects s ON s.subject_id = d.subject_id
      LEFT JOIN mst_lessons l ON l.lesson_id = d.lesson_id
      LEFT JOIN mst_chapters c ON c.chapter_id = l.chapter_id
      WHERE s.creator_id = ${creatorId}::uuid OR d.uploader_id = ${creatorId}::uuid
      ORDER BY (COALESCE(d.view_count, 0) + COALESCE(d.download_count, 0)) DESC, d.created_at_utc DESC
      LIMIT ${take}
    `;
  },

  async findTopFlashcardsByCreator(creatorId, take = 5) {
    return prisma.$queryRaw`
      SELECT
        f.flashcard_set_id AS "flashcardSetId",
        f.set_title AS "setTitle",
        f.lesson_id AS "lessonId",
        l.lesson_name AS "lessonName",
        l.chapter_id AS "chapterId",
        c.chapter_name AS "chapterName",
        f.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COALESCE(f.total_cards, 0)::int AS "totalCards",
        COALESCE(f.times_studied, 0)::int AS "timesStudied",
        COALESCE(f.average_rating, 0)::float8 AS "averageRating",
        COUNT(DISTINCT fs.session_id)::int AS "studySessionCount",
        COUNT(fr.review_id)::int AS "reviewCount",
        MAX(fs.started_at_utc) AS "lastStudiedAt"
      FROM cnt_flashcards f
      LEFT JOIN mst_subjects s ON s.subject_id = f.subject_id
      LEFT JOIN mst_lessons l ON l.lesson_id = f.lesson_id
      LEFT JOIN mst_chapters c ON c.chapter_id = l.chapter_id
      LEFT JOIN lrn_flashcard_sessions fs ON fs.flashcard_set_id = f.flashcard_set_id
      LEFT JOIN lrn_flashcard_reviews fr ON fr.session_id = fs.session_id
      WHERE s.creator_id = ${creatorId}::uuid OR f.creator_id = ${creatorId}::uuid
      GROUP BY
        f.flashcard_set_id,
        f.set_title,
        f.lesson_id,
        l.lesson_name,
        l.chapter_id,
        c.chapter_name,
        f.subject_id,
        s.subject_name,
        f.total_cards,
        f.times_studied,
        f.average_rating,
        f.created_at_utc
      ORDER BY
        GREATEST(COALESCE(f.times_studied, 0), COUNT(DISTINCT fs.session_id), COUNT(fr.review_id)) DESC,
        f.created_at_utc DESC
      LIMIT ${take}
    `;
  },

  async findTopQuestionsByCreator(creatorId, take = 5) {
    return prisma.$queryRaw`
      SELECT
        q.question_id AS "questionId",
        LEFT(q.question_text, 240) AS "questionText",
        q.question_type::text AS "questionType",
        q.difficulty_level::text AS "difficulty",
        q.lesson_id AS "lessonId",
        l.lesson_name AS "lessonName",
        l.chapter_id AS "chapterId",
        c.chapter_name AS "chapterName",
        q.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COALESCE(q.times_used, 0)::int AS "timesUsed",
        COUNT(qa.answer_id)::int AS "answerCount",
        COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = true)::int AS "correctCount",
        COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = false)::int AS "incorrectCount",
        CASE
          WHEN COUNT(qa.answer_id) = 0 THEN COALESCE(q.success_rate, 0)::float8
          ELSE ROUND((COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = true)::numeric / COUNT(qa.answer_id)) * 100, 1)::float8
        END AS "successRate"
      FROM cnt_questions q
      LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
      LEFT JOIN mst_lessons l ON l.lesson_id = q.lesson_id
      LEFT JOIN mst_chapters c ON c.chapter_id = l.chapter_id
      LEFT JOIN lrn_quiz_answers qa ON qa.question_id = q.question_id
      WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid
      GROUP BY
        q.question_id,
        q.question_text,
        q.question_type,
        q.difficulty_level,
        q.lesson_id,
        l.lesson_name,
        l.chapter_id,
        c.chapter_name,
        q.subject_id,
        s.subject_name,
        q.times_used,
        q.success_rate,
        q.created_at_utc
      ORDER BY GREATEST(COALESCE(q.times_used, 0), COUNT(qa.answer_id)) DESC, q.created_at_utc DESC
      LIMIT ${take}
    `;
  },

  async getQuestionTypeBreakdownByCreator(creatorId) {
    return prisma.$queryRaw`
      SELECT q.question_type::text AS "type", COUNT(DISTINCT q.question_id)::int AS "count"
      FROM cnt_questions q
      LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
      WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid
      GROUP BY q.question_type
      ORDER BY COUNT(DISTINCT q.question_id) DESC
    `;
  },

  async getQuestionDifficultyBreakdownByCreator(creatorId) {
    return prisma.$queryRaw`
      SELECT COALESCE(q.difficulty_level::text, 'unknown') AS "difficulty", COUNT(DISTINCT q.question_id)::int AS "count"
      FROM cnt_questions q
      LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
      WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid
      GROUP BY q.difficulty_level
      ORDER BY COUNT(DISTINCT q.question_id) DESC
    `;
  },

  async getQuizAttemptStatsByCreator(creatorId) {
    const rows = await prisma.$queryRaw`
      WITH creator_questions AS (
        SELECT DISTINCT q.question_id
        FROM cnt_questions q
        LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
        WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid
      ),
      creator_attempts AS (
        SELECT DISTINCT qa.attempt_id
        FROM lrn_quiz_answers qa
        INNER JOIN creator_questions cq ON cq.question_id = qa.question_id
      )
      SELECT
        COUNT(DISTINCT a.attempt_id)::int AS "totalAttempts",
        AVG(a.percentage_score)::float8 AS "averageScore",
        COUNT(*) FILTER (WHERE a.is_passed = true)::int AS "passedAttempts",
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND((COUNT(*) FILTER (WHERE a.is_passed = true)::numeric / COUNT(*)) * 100, 1)::float8
        END AS "passRate"
      FROM lrn_quiz_attempts a
      INNER JOIN creator_attempts ca ON ca.attempt_id = a.attempt_id
    `;
    return rows[0] || { totalAttempts: 0, averageScore: null, passedAttempts: 0, passRate: 0 };
  },

  async findMostMissedQuestionsByCreator(creatorId, take = 5) {
    return prisma.$queryRaw`
      SELECT
        q.question_id AS "questionId",
        LEFT(q.question_text, 240) AS "questionText",
        q.question_type::text AS "questionType",
        q.difficulty_level::text AS "difficulty",
        q.lesson_id AS "lessonId",
        l.lesson_name AS "lessonName",
        l.chapter_id AS "chapterId",
        c.chapter_name AS "chapterName",
        q.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COUNT(qa.answer_id)::int AS "answerCount",
        COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = false)::int AS "incorrectCount",
        CASE
          WHEN COUNT(qa.answer_id) = 0 THEN NULL
          ELSE ROUND((COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = true)::numeric / COUNT(qa.answer_id)) * 100, 1)::float8
        END AS "successRate"
      FROM cnt_questions q
      LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
      LEFT JOIN mst_lessons l ON l.lesson_id = q.lesson_id
      LEFT JOIN mst_chapters c ON c.chapter_id = l.chapter_id
      INNER JOIN lrn_quiz_answers qa ON qa.question_id = q.question_id
      WHERE s.creator_id = ${creatorId}::uuid OR q.creator_id = ${creatorId}::uuid
      GROUP BY
        q.question_id,
        q.question_text,
        q.question_type,
        q.difficulty_level,
        q.lesson_id,
        l.lesson_name,
        l.chapter_id,
        c.chapter_name,
        q.subject_id,
        s.subject_name
      HAVING COUNT(qa.answer_id) > 0
      ORDER BY
        (COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = false)::numeric / COUNT(qa.answer_id)) DESC,
        COUNT(qa.answer_id) DESC
      LIMIT ${take}
    `;
  },

  async getAdminCourseHealth(take = 8) {
    return prisma.$queryRaw`
      WITH course_base AS (
        SELECT
          s.subject_id,
          s.subject_code,
          s.subject_name,
          s.status,
          COALESCE(s.is_active, true) AS is_active,
          s.rating_average,
          s.rating_count,
          s.updated_at_utc,
          s.created_at_utc
        FROM mst_subjects s
      ),
      enrollments AS (
        SELECT
          sp.subject_id,
          COUNT(*)::int AS enrollment_count,
          COUNT(DISTINCT sp.user_id)::int AS unique_student_count,
          AVG(COALESCE(sp.progress_percent, 0))::float8 AS average_progress,
          COUNT(*) FILTER (
            WHERE COALESCE(sp.progress_percent, 0) >= 100 OR sp.completed_at_utc IS NOT NULL
          )::int AS completed_count
        FROM pmt_subject_purchases sp
        GROUP BY sp.subject_id
      ),
      videos AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_videos
        GROUP BY subject_id
      ),
      documents AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_documents
        GROUP BY subject_id
      ),
      questions AS (
        SELECT subject_id, COUNT(*)::int AS total
        FROM cnt_questions
        GROUP BY subject_id
      ),
      enriched AS (
        SELECT
          cb.subject_id AS "courseId",
          cb.subject_code AS "courseCode",
          cb.subject_name AS "courseName",
          cb.status,
          cb.is_active AS "isActive",
          COALESCE(cb.rating_average, 0)::float8 AS "ratingAverage",
          COALESCE(cb.rating_count, 0)::int AS "ratingCount",
          COALESCE(v.total, 0)::int AS "videoCount",
          COALESCE(d.total, 0)::int AS "documentCount",
          COALESCE(q.total, 0)::int AS "questionCount",
          COALESCE(e.enrollment_count, 0)::int AS "enrollmentCount",
          COALESCE(e.unique_student_count, 0)::int AS "studentCount",
          COALESCE(e.average_progress, 0)::float8 AS "averageProgress",
          COALESCE(e.completed_count, 0)::int AS "completedCount",
          CASE
            WHEN COALESCE(e.enrollment_count, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(e.completed_count, 0)::numeric / e.enrollment_count) * 100, 1)::float8
          END AS "completionRate",
          COALESCE(cb.updated_at_utc, cb.created_at_utc) AS "lastUpdatedAt"
        FROM course_base cb
        LEFT JOIN enrollments e ON e.subject_id = cb.subject_id
        LEFT JOIN videos v ON v.subject_id = cb.subject_id
        LEFT JOIN documents d ON d.subject_id = cb.subject_id
        LEFT JOIN questions q ON q.subject_id = cb.subject_id
      )
      SELECT
        'allCourses' AS "bucket",
        row_to_json(enriched)::jsonb AS "item"
      FROM enriched
      UNION ALL
      SELECT 'missingContent', row_to_json(e)::jsonb
      FROM enriched e
      WHERE e."videoCount" = 0 OR e."documentCount" = 0 OR e."questionCount" = 0
      ORDER BY "bucket" ASC
      LIMIT ${take * 20}
    `;
  },

  async getAdminCourseStatusSummary() {
    const rows = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true AND status = 'published')::int AS "published",
        COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true AND status = 'draft')::int AS "draft",
        COUNT(*) FILTER (
          WHERE COALESCE(is_active, false) = false OR COALESCE(status, '') IN ('inactive', 'archived', 'deleted')
        )::int AS "inactive"
      FROM mst_subjects
    `;
    return rows[0] || { total: 0, published: 0, draft: 0, inactive: 0 };
  },

  async getAdminCourseHealthRows() {
    return prisma.$queryRaw`
      WITH enrollments AS (
        SELECT
          sp.subject_id,
          COUNT(*)::int AS enrollment_count,
          COUNT(DISTINCT sp.user_id)::int AS student_count,
          AVG(COALESCE(sp.progress_percent, 0))::float8 AS average_progress,
          COUNT(*) FILTER (
            WHERE COALESCE(sp.progress_percent, 0) >= 100 OR sp.completed_at_utc IS NOT NULL
          )::int AS completed_count
        FROM pmt_subject_purchases sp
        GROUP BY sp.subject_id
      ),
      videos AS (SELECT subject_id, COUNT(*)::int AS total FROM cnt_videos GROUP BY subject_id),
      documents AS (SELECT subject_id, COUNT(*)::int AS total FROM cnt_documents GROUP BY subject_id),
      questions AS (SELECT subject_id, COUNT(*)::int AS total FROM cnt_questions GROUP BY subject_id)
      SELECT
        s.subject_id AS "courseId",
        s.subject_code AS "courseCode",
        s.subject_name AS "courseName",
        s.status,
        COALESCE(s.is_active, true) AS "isActive",
        COALESCE(s.rating_average, 0)::float8 AS "ratingAverage",
        COALESCE(s.rating_count, 0)::int AS "ratingCount",
        COALESCE(v.total, 0)::int AS "videoCount",
        COALESCE(d.total, 0)::int AS "documentCount",
        COALESCE(q.total, 0)::int AS "questionCount",
        COALESCE(e.enrollment_count, 0)::int AS "enrollmentCount",
        COALESCE(e.student_count, 0)::int AS "studentCount",
        COALESCE(e.average_progress, 0)::float8 AS "averageProgress",
        COALESCE(e.completed_count, 0)::int AS "completedCount",
        CASE
          WHEN COALESCE(e.enrollment_count, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(e.completed_count, 0)::numeric / e.enrollment_count) * 100, 1)::float8
        END AS "completionRate",
        COALESCE(s.updated_at_utc, s.created_at_utc) AS "lastUpdatedAt"
      FROM mst_subjects s
      LEFT JOIN enrollments e ON e.subject_id = s.subject_id
      LEFT JOIN videos v ON v.subject_id = s.subject_id
      LEFT JOIN documents d ON d.subject_id = s.subject_id
      LEFT JOIN questions q ON q.subject_id = s.subject_id
    `;
  },

  async getAdminContentStats(startUtc, endUtc) {
    return prisma.$queryRaw`
      SELECT *
      FROM (
        SELECT
          'videos' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE created_at_utc >= ${startUtc} AND created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_videos

        UNION ALL

        SELECT
          'documents' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE created_at_utc >= ${startUtc} AND created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_documents

        UNION ALL

        SELECT
          'questions' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE created_at_utc >= ${startUtc} AND created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_questions

        UNION ALL

        SELECT
          'flashcards' AS "type",
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE created_at_utc >= ${startUtc} AND created_at_utc <= ${endUtc})::int AS "newInPeriod",
          COUNT(*) FILTER (WHERE COALESCE(status, '') IN ('draft', 'processing'))::int AS "pending"
        FROM cnt_flashcards
      ) content_stats
    `;
  },

  async findAdminLowCompletionVideos(take = 8) {
    return prisma.$queryRaw`
      SELECT
        v.video_id AS "videoId",
        v.video_title AS "videoTitle",
        v.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COUNT(vp.progress_id)::int AS "learnerCount",
        AVG(COALESCE(vp.completion_percentage, 0))::float8 AS "averageCompletion",
        SUM(COALESCE(vp.watch_duration_seconds, 0))::int AS "totalWatchSeconds"
      FROM cnt_videos v
      LEFT JOIN mst_subjects s ON s.subject_id = v.subject_id
      INNER JOIN lrn_video_progress vp ON vp.video_id = v.video_id
      GROUP BY v.video_id, v.video_title, v.subject_id, s.subject_name
      HAVING COUNT(vp.progress_id) > 0
      ORDER BY AVG(COALESCE(vp.completion_percentage, 0)) ASC, COUNT(vp.progress_id) DESC
      LIMIT ${take}
    `;
  },

  async findAdminTopDocuments(take = 8) {
    return prisma.$queryRaw`
      SELECT
        d.document_id AS "documentId",
        d.document_title AS "documentTitle",
        d.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COALESCE(d.view_count, 0)::int AS "viewCount",
        COALESCE(d.download_count, 0)::int AS "downloadCount",
        (COALESCE(d.view_count, 0) + COALESCE(d.download_count, 0))::int AS "interactionCount"
      FROM cnt_documents d
      LEFT JOIN mst_subjects s ON s.subject_id = d.subject_id
      ORDER BY (COALESCE(d.view_count, 0) + COALESCE(d.download_count, 0)) DESC, d.created_at_utc DESC
      LIMIT ${take}
    `;
  },

  async findAdminTopFlashcards(take = 8) {
    return prisma.$queryRaw`
      SELECT
        f.flashcard_set_id AS "flashcardSetId",
        f.set_title AS "setTitle",
        f.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COALESCE(f.total_cards, 0)::int AS "totalCards",
        COALESCE(f.times_studied, 0)::int AS "timesStudied",
        COUNT(DISTINCT fs.session_id)::int AS "studySessionCount",
        COUNT(fr.review_id)::int AS "reviewCount",
        MAX(fs.started_at_utc) AS "lastStudiedAt"
      FROM cnt_flashcards f
      LEFT JOIN mst_subjects s ON s.subject_id = f.subject_id
      LEFT JOIN lrn_flashcard_sessions fs ON fs.flashcard_set_id = f.flashcard_set_id
      LEFT JOIN lrn_flashcard_reviews fr ON fr.session_id = fs.session_id
      GROUP BY f.flashcard_set_id, f.set_title, f.subject_id, s.subject_name, f.total_cards, f.times_studied, f.created_at_utc
      ORDER BY GREATEST(COALESCE(f.times_studied, 0), COUNT(DISTINCT fs.session_id), COUNT(fr.review_id)) DESC, f.created_at_utc DESC
      LIMIT ${take}
    `;
  },

  async getAdminQuestionTypeBreakdown() {
    return prisma.$queryRaw`
      SELECT question_type::text AS "type", COUNT(*)::int AS "count"
      FROM cnt_questions
      GROUP BY question_type
      ORDER BY COUNT(*) DESC
    `;
  },

  async getAdminQuestionDifficultyBreakdown() {
    return prisma.$queryRaw`
      SELECT COALESCE(difficulty_level::text, 'unknown') AS "difficulty", COUNT(*)::int AS "count"
      FROM cnt_questions
      GROUP BY difficulty_level
      ORDER BY COUNT(*) DESC
    `;
  },

  async findAdminMostMissedQuestions(take = 8) {
    return prisma.$queryRaw`
      SELECT
        q.question_id AS "questionId",
        LEFT(q.question_text, 240) AS "questionText",
        q.question_type::text AS "questionType",
        q.difficulty_level::text AS "difficulty",
        q.subject_id AS "courseId",
        s.subject_name AS "courseName",
        COUNT(qa.answer_id)::int AS "answerCount",
        COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = false)::int AS "incorrectCount",
        CASE
          WHEN COUNT(qa.answer_id) = 0 THEN NULL
          ELSE ROUND((COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = true)::numeric / COUNT(qa.answer_id)) * 100, 1)::float8
        END AS "successRate"
      FROM cnt_questions q
      LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
      INNER JOIN lrn_quiz_answers qa ON qa.question_id = q.question_id
      GROUP BY q.question_id, q.question_text, q.question_type, q.difficulty_level, q.subject_id, s.subject_name
      HAVING COUNT(qa.answer_id) > 0
      ORDER BY
        (COUNT(qa.answer_id) FILTER (WHERE qa.is_correct = false)::numeric / COUNT(qa.answer_id)) DESC,
        COUNT(qa.answer_id) DESC
      LIMIT ${take}
    `;
  },

  async getAdminLearningSummary() {
    const rows = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "totalEnrollments",
        COUNT(*) FILTER (WHERE COALESCE(progress_percent, 0) > 0 AND COALESCE(progress_percent, 0) < 100)::int AS "activeEnrollments",
        COUNT(*) FILTER (WHERE COALESCE(progress_percent, 0) >= 100 OR completed_at_utc IS NOT NULL)::int AS "completedEnrollments",
        COUNT(DISTINCT user_id)::int AS "uniqueLearners",
        AVG(COALESCE(progress_percent, 0))::float8 AS "averageProgress"
      FROM pmt_subject_purchases
      WHERE COALESCE(status, 'active') = 'active'
    `;
    return rows[0] || {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      uniqueLearners: 0,
      averageProgress: 0,
    };
  },

  async getAdminProgressDistribution() {
    return prisma.$queryRaw`
      SELECT
        CASE
          WHEN COALESCE(progress_percent, 0) = 0 THEN 'notStarted'
          WHEN COALESCE(progress_percent, 0) BETWEEN 1 AND 25 THEN 'p1_25'
          WHEN COALESCE(progress_percent, 0) BETWEEN 26 AND 50 THEN 'p26_50'
          WHEN COALESCE(progress_percent, 0) BETWEEN 51 AND 75 THEN 'p51_75'
          WHEN COALESCE(progress_percent, 0) BETWEEN 76 AND 99 THEN 'p76_99'
          ELSE 'completed'
        END AS "key",
        COUNT(*)::int AS "count"
      FROM pmt_subject_purchases
      WHERE COALESCE(status, 'active') = 'active'
      GROUP BY 1
    `;
  },

  async getAdminLessonVideoLearningRows(take = 8) {
    const [lessonRows, videoRows, dropRows, totals] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          lp.lesson_id AS "lessonId",
          l.lesson_name AS "lessonName",
          lp.subject_id AS "courseId",
          s.subject_name AS "courseName",
          COUNT(DISTINCT lp.user_id)::int AS "learnerCount",
          COUNT(*) FILTER (WHERE lp.completed = true)::int AS "completedCount"
        FROM lrn_subject_lesson_progress lp
        LEFT JOIN mst_lessons l ON l.lesson_id = lp.lesson_id
        LEFT JOIN mst_subjects s ON s.subject_id = lp.subject_id
        WHERE COALESCE(lp.status, 'active') = 'active'
        GROUP BY lp.lesson_id, l.lesson_name, lp.subject_id, s.subject_name
        ORDER BY COUNT(DISTINCT lp.user_id) DESC, COUNT(*) FILTER (WHERE lp.completed = true) DESC
        LIMIT ${take}
      `,
      prisma.$queryRaw`
        SELECT
          vp.video_id AS "videoId",
          v.video_title AS "videoTitle",
          v.subject_id AS "courseId",
          s.subject_name AS "courseName",
          COUNT(DISTINCT vp.user_id)::int AS "learnerCount",
          SUM(COALESCE(vp.watch_count, 0))::int AS "watchCount",
          AVG(COALESCE(vp.completion_percentage, 0))::float8 AS "averageCompletion",
          SUM(COALESCE(vp.watch_duration_seconds, 0))::int AS "totalWatchSeconds"
        FROM lrn_video_progress vp
        LEFT JOIN cnt_videos v ON v.video_id = vp.video_id
        LEFT JOIN mst_subjects s ON s.subject_id = v.subject_id
        GROUP BY vp.video_id, v.video_title, v.subject_id, s.subject_name
        ORDER BY COUNT(DISTINCT vp.user_id) DESC, SUM(COALESCE(vp.watch_count, 0)) DESC
        LIMIT ${take}
      `,
      prisma.$queryRaw`
        SELECT
          lp.lesson_id AS "lessonId",
          l.lesson_name AS "lessonName",
          lp.subject_id AS "courseId",
          s.subject_name AS "courseName",
          COUNT(DISTINCT lp.user_id)::int AS "learnerCount",
          COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::int AS "completedLearners",
          CASE
            WHEN COUNT(DISTINCT lp.user_id) = 0 THEN 0
            ELSE ROUND(((COUNT(DISTINCT lp.user_id) - COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true))::numeric / COUNT(DISTINCT lp.user_id)) * 100, 1)::float8
          END AS "dropOffRate"
        FROM lrn_subject_lesson_progress lp
        LEFT JOIN mst_lessons l ON l.lesson_id = lp.lesson_id
        LEFT JOIN mst_subjects s ON s.subject_id = lp.subject_id
        WHERE COALESCE(lp.status, 'active') = 'active'
        GROUP BY lp.lesson_id, l.lesson_name, lp.subject_id, s.subject_name
        HAVING COUNT(DISTINCT lp.user_id) > 0
        ORDER BY "dropOffRate" DESC, COUNT(DISTINCT lp.user_id) DESC
        LIMIT ${take}
      `,
      prisma.$queryRaw`
        SELECT
          (SELECT COUNT(*)::int FROM lrn_subject_lesson_progress WHERE completed = true) AS "completedLessonCount",
          (SELECT COALESCE(SUM(watch_duration_seconds), 0)::int FROM lrn_video_progress) AS "totalVideoWatchSeconds"
      `,
    ]);

    return {
      topLessons: lessonRows,
      topVideos: videoRows,
      dropOffPoints: dropRows,
      totals: totals[0] || { completedLessonCount: 0, totalVideoWatchSeconds: 0 },
    };
  },

  async getAdminPaymentOperations(startUtc, endUtc) {
    const [statusRows, revenueRows, failedTransactions, stalePendingOrders, paymentMethods, topCoupons] =
      await Promise.all([
        prisma.$queryRaw`
          SELECT payment_status::text AS "status", COUNT(*)::int AS "count"
          FROM pmt_orders
          GROUP BY payment_status
        `,
        prisma.$queryRaw`
          SELECT
            COALESCE(SUM(total_amount) FILTER (
              WHERE payment_status = 'completed' AND paid_at_utc >= ${startUtc} AND paid_at_utc <= ${endUtc}
            ), 0)::float8 AS "revenueInPeriod",
            COALESCE(SUM(discount_amount) FILTER (
              WHERE created_at_utc >= ${startUtc} AND created_at_utc <= ${endUtc}
            ), 0)::float8 AS "discountInPeriod",
            COALESCE((
              SELECT SUM(COALESCE(refund_amount, 0))::float8
              FROM pmt_transactions
              WHERE refunded_at_utc >= ${startUtc} AND refunded_at_utc <= ${endUtc}
            ), 0)::float8 AS "refundAmount"
          FROM pmt_orders
        `,
        prisma.pmt_transactions.findMany({
          where: { payment_status: "failed" },
          take: 8,
          orderBy: [{ failed_at_utc: "desc" }, { created_at_utc: "desc" }],
          select: {
            transaction_id: true,
            order_id: true,
            transaction_type: true,
            sepay_order_code: true,
            sepay_transaction_id: true,
            amount: true,
            currency_code: true,
            payment_method: true,
            bank_code: true,
            failure_reason: true,
            failed_at_utc: true,
            created_at_utc: true,
            pmt_orders: {
              select: {
                order_code: true,
                customer_email: true,
                customer_name: true,
                pmt_order_items: {
                  take: 3,
                  select: {
                    item_name: true,
                    item_type: true,
                  },
                },
              },
            },
          },
        }),
        prisma.pmt_orders.findMany({
          where: {
            payment_status: "pending",
            created_at_utc: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          take: 8,
          orderBy: { created_at_utc: "asc" },
          select: {
            order_id: true,
            order_code: true,
            total_amount: true,
            currency_code: true,
            customer_email: true,
            customer_name: true,
            created_at_utc: true,
            pmt_order_items: {
              take: 3,
              select: {
                item_name: true,
                item_type: true,
              },
            },
          },
        }),
        prisma.$queryRaw`
          SELECT
            COALESCE(payment_method, 'unknown') AS "paymentMethod",
            COALESCE(bank_code, 'unknown') AS "bankCode",
            payment_status::text AS "status",
            COUNT(*)::int AS "count",
            COALESCE(SUM(amount), 0)::float8 AS "amount"
          FROM pmt_transactions
          GROUP BY payment_method, bank_code, payment_status
          ORDER BY COUNT(*) DESC
        `,
        prisma.$queryRaw`
          SELECT
            c.coupon_id AS "couponId",
            c.coupon_code AS "couponCode",
            c.coupon_name AS "couponName",
            COUNT(cu.usage_id)::int AS "usageCount",
            COALESCE(SUM(cu.discount_applied), 0)::float8 AS "discountApplied"
          FROM pmt_coupon_usages cu
          INNER JOIN pmt_coupons c ON c.coupon_id = cu.coupon_id
          GROUP BY c.coupon_id, c.coupon_code, c.coupon_name
          ORDER BY COUNT(cu.usage_id) DESC, SUM(cu.discount_applied) DESC
          LIMIT 8
        `,
      ]);

    return {
      statusRows,
      revenue: revenueRows[0] || { revenueInPeriod: 0, discountInPeriod: 0, refundAmount: 0 },
      failedTransactions,
      stalePendingOrders,
      paymentMethods,
      topCoupons,
    };
  },

  async getAdminCreatorPerformance(take = 8) {
    const [summaryRows, creatorRows, missingContentRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT ur.user_id)::int AS "totalCreators"
        FROM mst_user_roles ur
        INNER JOIN mst_roles r ON r.role_id = ur.role_id
        WHERE r.role_code = 'creator'
          AND COALESCE(ur.is_active, true) = true
          AND (ur.expires_at_utc IS NULL OR ur.expires_at_utc > NOW())
      `,
      prisma.$queryRaw`
        WITH creator_users AS (
          SELECT DISTINCT u.user_id, u.full_name, u.display_name, u.email, u.avatar_url
          FROM mst_users u
          INNER JOIN mst_user_roles ur ON ur.user_id = u.user_id
          INNER JOIN mst_roles r ON r.role_id = ur.role_id
          WHERE r.role_code = 'creator'
            AND COALESCE(ur.is_active, true) = true
            AND (ur.expires_at_utc IS NULL OR ur.expires_at_utc > NOW())
        ),
        course_stats AS (
          SELECT
            s.creator_id,
            COUNT(*)::int AS total_courses,
            COUNT(*) FILTER (WHERE COALESCE(s.is_active, true) = true AND s.status = 'published')::int AS published_courses,
            COUNT(*) FILTER (WHERE COALESCE(s.is_active, true) = true AND s.status = 'draft')::int AS draft_courses,
            COUNT(*) FILTER (WHERE COALESCE(s.is_active, false) = false OR COALESCE(s.status, '') IN ('inactive', 'archived', 'deleted'))::int AS inactive_courses,
            AVG(s.rating_average) FILTER (WHERE s.rating_average IS NOT NULL)::float8 AS average_rating,
            SUM(COALESCE(s.rating_count, 0))::int AS rating_count
          FROM mst_subjects s
          WHERE s.creator_id IS NOT NULL
          GROUP BY s.creator_id
        ),
        student_stats AS (
          SELECT s.creator_id, COUNT(DISTINCT sp.user_id)::int AS student_count
          FROM pmt_subject_purchases sp
          INNER JOIN mst_subjects s ON s.subject_id = sp.subject_id
          WHERE s.creator_id IS NOT NULL
          GROUP BY s.creator_id
        ),
        missing_content AS (
          SELECT
            s.creator_id,
            COUNT(*) FILTER (
              WHERE COALESCE(v.total, 0) = 0 OR COALESCE(d.total, 0) = 0 OR COALESCE(q.total, 0) = 0
            )::int AS missing_content_courses
          FROM mst_subjects s
          LEFT JOIN (SELECT subject_id, COUNT(*)::int AS total FROM cnt_videos GROUP BY subject_id) v ON v.subject_id = s.subject_id
          LEFT JOIN (SELECT subject_id, COUNT(*)::int AS total FROM cnt_documents GROUP BY subject_id) d ON d.subject_id = s.subject_id
          LEFT JOIN (SELECT subject_id, COUNT(*)::int AS total FROM cnt_questions GROUP BY subject_id) q ON q.subject_id = s.subject_id
          WHERE s.creator_id IS NOT NULL
          GROUP BY s.creator_id
        )
        SELECT
          cu.user_id AS "creatorId",
          COALESCE(cu.full_name, cu.display_name, cu.email) AS "creatorName",
          cu.email,
          cu.avatar_url AS "avatarUrl",
          COALESCE(cs.total_courses, 0)::int AS "totalCourses",
          COALESCE(cs.published_courses, 0)::int AS "publishedCourses",
          COALESCE(cs.draft_courses, 0)::int AS "draftCourses",
          COALESCE(cs.inactive_courses, 0)::int AS "inactiveCourses",
          COALESCE(ss.student_count, 0)::int AS "studentCount",
          COALESCE(cs.average_rating, 0)::float8 AS "averageRating",
          COALESCE(cs.rating_count, 0)::int AS "ratingCount",
          COALESCE(mc.missing_content_courses, 0)::int AS "missingContentCourses"
        FROM creator_users cu
        LEFT JOIN course_stats cs ON cs.creator_id = cu.user_id
        LEFT JOIN student_stats ss ON ss.creator_id = cu.user_id
        LEFT JOIN missing_content mc ON mc.creator_id = cu.user_id
      `,
      prisma.$queryRaw`
        WITH content_counts AS (
          SELECT
            s.subject_id,
            COUNT(DISTINCT v.video_id)::int AS video_count,
            COUNT(DISTINCT d.document_id)::int AS document_count,
            COUNT(DISTINCT q.question_id)::int AS question_count
          FROM mst_subjects s
          LEFT JOIN cnt_videos v ON v.subject_id = s.subject_id
          LEFT JOIN cnt_documents d ON d.subject_id = s.subject_id
          LEFT JOIN cnt_questions q ON q.subject_id = s.subject_id
          WHERE s.creator_id IS NOT NULL
          GROUP BY s.subject_id
        )
        SELECT
          s.creator_id AS "creatorId",
          s.subject_id AS "courseId",
          s.subject_code AS "courseCode",
          s.subject_name AS "courseName",
          COALESCE(cc.video_count, 0)::int AS "videoCount",
          COALESCE(cc.document_count, 0)::int AS "documentCount",
          COALESCE(cc.question_count, 0)::int AS "questionCount"
        FROM mst_subjects s
        LEFT JOIN content_counts cc ON cc.subject_id = s.subject_id
        WHERE s.creator_id IS NOT NULL
          AND (
            COALESCE(cc.video_count, 0) = 0
            OR COALESCE(cc.document_count, 0) = 0
            OR COALESCE(cc.question_count, 0) = 0
          )
        ORDER BY s.subject_name ASC
      `,
    ]);

    return {
      summary: summaryRows[0] || { totalCreators: 0 },
      creators: creatorRows,
      missingContentRows,
      take,
    };
  },

  async getAdminQuizQuality(take = 8) {
    const [statsRows, mostMissed, unusedQuestions, typeBreakdown, difficultyBreakdown] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int AS "totalAttempts",
          AVG(percentage_score)::float8 AS "averageScore",
          COUNT(*) FILTER (WHERE is_passed = true)::int AS "passedAttempts",
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE is_passed = true)::numeric / COUNT(*)) * 100, 1)::float8
          END AS "passRate"
        FROM lrn_quiz_attempts
      `,
      this.findAdminMostMissedQuestions(take),
      prisma.$queryRaw`
        SELECT
          q.question_id AS "questionId",
          LEFT(q.question_text, 240) AS "questionText",
          q.question_type::text AS "questionType",
          q.difficulty_level::text AS "difficulty",
          q.subject_id AS "courseId",
          s.subject_name AS "courseName",
          q.created_at_utc AS "createdAtUtc"
        FROM cnt_questions q
        LEFT JOIN mst_subjects s ON s.subject_id = q.subject_id
        LEFT JOIN lrn_quiz_answers qa ON qa.question_id = q.question_id
        WHERE qa.answer_id IS NULL
        ORDER BY q.created_at_utc DESC
        LIMIT ${take}
      `,
      this.getAdminQuestionTypeBreakdown(),
      this.getAdminQuestionDifficultyBreakdown(),
    ]);

    return {
      stats: statsRows[0] || { totalAttempts: 0, averageScore: null, passedAttempts: 0, passRate: 0 },
      mostMissedQuestions: mostMissed,
      unusedQuestions,
      questionTypeBreakdown: typeBreakdown,
      difficultyBreakdown,
    };
  },

  async findRecentUsers(take = 10) {
    return prisma.mst_users.findMany({
      take,
      orderBy: { created_at_utc: "desc" },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        display_name: true,
        avatar_url: true,
        email_verified: true,
        is_active: true,
        created_at_utc: true,
        mst_user_roles: {
          where: {
            is_active: true,
            OR: [{ expires_at_utc: null }, { expires_at_utc: { gt: new Date() } }],
          },
          take: 3,
          orderBy: { assigned_at_utc: "desc" },
          include: {
            mst_roles: { select: { role_code: true, role_name: true } },
          },
        },
      },
    });
  },

  async findRecentOrders(take = 10) {
    return prisma.pmt_orders.findMany({
      take,
      orderBy: { created_at_utc: "desc" },
      select: {
        order_id: true,
        order_code: true,
        total_amount: true,
        currency_code: true,
        customer_name: true,
        customer_email: true,
        payment_status: true,
        created_at_utc: true,
        paid_at_utc: true,
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            email: true,
            avatar_url: true,
          },
        },
        pmt_order_items: {
          take: 3,
          select: {
            item_name: true,
            item_type: true,
            item_id: true,
          },
        },
      },
    });
  },
};

module.exports = dashboardRepository;
