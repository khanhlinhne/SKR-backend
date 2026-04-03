const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const expertRepository = require("../repositories/expert.repository");
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

const expertService = {
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
