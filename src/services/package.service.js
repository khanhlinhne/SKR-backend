const AppError = require("../utils/AppError");
const packageRepository = require("../repositories/package.repository");
const packageDto = require("../dtos/package.dto");
const prisma = require("../config/prisma");

const ALLOWED_SORT_FIELDS = {
  createdAt: "created_at_utc",
  publishedAt: "published_at_utc",
  packageName: "package_name",
  displayOrder: "display_order",
  priceAmount: "price_amount",
  purchaseCount: "purchase_count",
};

const packageService = {
  async getPackages(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = { is_active: true };

    if (query.search) {
      where.OR = [
        { package_name: { contains: query.search, mode: "insensitive" } },
        { package_code: { contains: query.search, mode: "insensitive" } },
        { package_description: { contains: query.search, mode: "insensitive" } },
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

    const sortField = ALLOWED_SORT_FIELDS[query.sortBy] || "created_at_utc";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [sortField]: sortOrder };

    const { items, totalItems } = await packageRepository.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(packageDto.toListItem),
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

  async getPackageDetail(packageId) {
    const pkg = await packageRepository.findById(packageId);

    if (!pkg || !pkg.is_active) {
      throw AppError.notFound("Package not found");
    }

    return packageDto.toDetail(pkg);
  },

  async createPackage(data, userId) {
    const existing = await packageRepository.findByCode(data.packageCode);
    if (existing) {
      throw AppError.conflict(`Package code "${data.packageCode}" already exists`);
    }

    const created = await packageRepository.create({
      package_code: data.packageCode,
      package_name: data.packageName,
      package_description: data.packageDescription || null,
      package_icon_url: data.packageIconUrl || null,
      package_banner_url: data.packageBannerUrl || null,
      display_order: data.displayOrder ?? 0,
      is_free: data.isFree ?? false,
      price_amount: data.priceAmount ?? 0,
      original_price: data.originalPrice || null,
      currency_code: data.currencyCode || "VND",
      discount_percent: data.discountPercent ?? 0,
      discount_valid_until_utc: data.discountValidUntil || null,
      is_featured: data.isFeatured ?? false,
      status: data.status || "draft",
      created_by: userId,
    });

    return packageDto.toListItem(created);
  },

  async updatePackage(packageId, data, userId) {
    const pkg = await packageRepository.findById(packageId);

    if (!pkg || !pkg.is_active) {
      throw AppError.notFound("Package not found");
    }

    const updateData = { updated_by: userId, updated_at_utc: new Date() };

    if (data.packageName !== undefined) updateData.package_name = data.packageName;
    if (data.packageDescription !== undefined) updateData.package_description = data.packageDescription;
    if (data.packageIconUrl !== undefined) updateData.package_icon_url = data.packageIconUrl;
    if (data.packageBannerUrl !== undefined) updateData.package_banner_url = data.packageBannerUrl;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.isFree !== undefined) updateData.is_free = data.isFree;
    if (data.priceAmount !== undefined) updateData.price_amount = data.priceAmount;
    if (data.originalPrice !== undefined) updateData.original_price = data.originalPrice;
    if (data.currencyCode !== undefined) updateData.currency_code = data.currencyCode;
    if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent;
    if (data.discountValidUntil !== undefined) updateData.discount_valid_until_utc = data.discountValidUntil;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.status === "published" && !pkg.published_at_utc) {
      updateData.published_at_utc = new Date();
    }

    await packageRepository.update(packageId, updateData);
    const updated = await packageRepository.findById(packageId);
    return packageDto.toDetail(updated);
  },

  async deletePackage(packageId, userId) {
    const pkg = await packageRepository.findById(packageId);

    if (!pkg || !pkg.is_active) {
      throw AppError.notFound("Package not found");
    }

    await packageRepository.softDelete(packageId, userId);
  },

  async addCourseToPackage(packageId, data, userId) {
    const pkg = await packageRepository.findById(packageId);
    if (!pkg || !pkg.is_active) {
      throw AppError.notFound("Package not found");
    }

    const subject = await prisma.mst_subjects.findUnique({
      where: { subject_id: data.subjectId },
    });
    if (!subject || !subject.is_active) {
      throw AppError.notFound("Subject not found");
    }

    const existing = await packageRepository.findPackageCourse(packageId, data.subjectId);
    if (existing) {
      throw AppError.conflict("This subject is already in the package");
    }

    const maxOrder = await packageRepository.getMaxCourseOrder(packageId);

    await packageRepository.addCourse({
      package_id: packageId,
      subject_id: data.subjectId,
      display_order: data.displayOrder ?? maxOrder + 1,
      created_by: userId,
    });

    await packageRepository.updateStats(packageId);

    const updated = await packageRepository.findById(packageId);
    return packageDto.toDetail(updated);
  },

  async removeCourseFromPackage(packageId, subjectId, userId) {
    const pkg = await packageRepository.findById(packageId);
    if (!pkg || !pkg.is_active) {
      throw AppError.notFound("Package not found");
    }

    const existing = await packageRepository.findPackageCourse(packageId, subjectId);
    if (!existing) {
      throw AppError.notFound("Subject not found in this package");
    }

    await packageRepository.removeCourse(packageId, subjectId);
    await packageRepository.updateStats(packageId);

    const updated = await packageRepository.findById(packageId);
    return packageDto.toDetail(updated);
  },
};

module.exports = packageService;
