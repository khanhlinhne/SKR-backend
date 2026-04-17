const prisma = require("../config/prisma");

const userSelectPublic = {
  user_id: true,
  email: true,
  full_name: true,
  display_name: true,
  avatar_url: true,
  bio: true,
  is_active: true,
};

const expertRepository = {
  async findMany({ where, orderBy, skip, take, includeUser = true }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.mst_experts.findMany({
        where,
        orderBy,
        skip,
        take,
        include: includeUser ? { mst_users: { select: userSelectPublic } } : undefined,
      }),
      prisma.mst_experts.count({ where }),
    ]);
    return { items, totalItems };
  },

  async findById(expertId, { includeUser = true } = {}) {
    return prisma.mst_experts.findUnique({
      where: { expert_id: expertId },
      include: includeUser ? { mst_users: { select: userSelectPublic } } : undefined,
    });
  },

  async findByUserId(userId) {
    return prisma.mst_experts.findUnique({
      where: { user_id: userId },
      include: { mst_users: { select: userSelectPublic } },
    });
  },

  async create(data) {
    return prisma.mst_experts.create({
      data: {
        user_id: data.userId,
        headline: data.headline ?? null,
        expertise_summary: data.expertiseSummary ?? null,
        subject_course_ids: data.subjectCourseIds ?? null,
        display_order: data.displayOrder ?? 0,
        status: data.status ?? "active",
        created_by: data.createdBy,
        is_active: true,
      },
      include: { mst_users: { select: userSelectPublic } },
    });
  },

  async update(expertId, data) {
    return prisma.mst_experts.update({
      where: { expert_id: expertId },
      data: {
        ...(data.headline !== undefined ? { headline: data.headline } : {}),
        ...(data.expertiseSummary !== undefined ? { expertise_summary: data.expertiseSummary } : {}),
        ...(data.subjectCourseIds !== undefined ? { subject_course_ids: data.subjectCourseIds } : {}),
        ...(data.displayOrder !== undefined ? { display_order: data.displayOrder } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
        updated_by: data.updatedBy,
        updated_at_utc: new Date(),
      },
      include: { mst_users: { select: userSelectPublic } },
    });
  },
};

module.exports = expertRepository;
