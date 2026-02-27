const AppError = require("../utils/AppError");
const subjectRepository = require("../repositories/subject.repository");
const subjectDto = require("../dtos/subject.dto");

const ALLOWED_SORT_FIELDS = {
  createdAt: "created_at_utc",
  publishedAt: "published_at_utc",
  subjectName: "subject_name",
  displayOrder: "display_order",
  priceAmount: "price_amount",
  purchaseCount: "purchase_count",
  ratingAverage: "rating_average",
};

const subjectService = {
  async getSubjects(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = { is_active: true };

    if (query.search) {
      where.OR = [
        { subject_name: { contains: query.search, mode: "insensitive" } },
        { subject_code: { contains: query.search, mode: "insensitive" } },
        { subject_description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isFree !== undefined && query.isFree !== "") {
      where.is_free = query.isFree === "true";
    }

    if (query.isFeatured !== undefined && query.isFeatured !== "") {
      where.is_featured = query.isFeatured === "true";
    }

    if (query.creatorId) {
      where.creator_id = query.creatorId;
    }

    const sortField = ALLOWED_SORT_FIELDS[query.sortBy] || "created_at_utc";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [sortField]: sortOrder };

    const { items, totalItems } = await subjectRepository.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(subjectDto.toListItem),
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

  async getSubjectDetail(subjectId) {
    const subject = await subjectRepository.findById(subjectId);

    if (!subject || !subject.is_active) {
      throw AppError.notFound("Subject not found");
    }

    return subjectDto.toDetail(subject);
  },
};

module.exports = subjectService;
