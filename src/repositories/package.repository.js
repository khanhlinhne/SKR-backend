const prisma = require("../config/prisma");

const packageRepository = {
  async findMany({ where, orderBy, skip, take }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.mst_packages.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          _count: {
            select: { mst_package_courses: true },
          },
        },
      }),
      prisma.mst_packages.count({ where }),
    ]);

    return { items, totalItems };
  },

  async findById(packageId) {
    return prisma.mst_packages.findUnique({
      where: { package_id: packageId },
      include: {
        mst_package_courses: {
          orderBy: { display_order: "asc" },
          include: {
            mst_subjects: {
              select: {
                subject_id: true,
                subject_code: true,
                subject_name: true,
                subject_icon_url: true,
                is_free: true,
                price_amount: true,
                total_chapters: true,
                total_lessons: true,
                rating_average: true,
                status: true,
              },
            },
          },
        },
      },
    });
  },

  async findByCode(packageCode) {
    return prisma.mst_packages.findUnique({
      where: { package_code: packageCode },
    });
  },

  async create(data) {
    return prisma.mst_packages.create({ data });
  },

  async update(packageId, data) {
    return prisma.mst_packages.update({
      where: { package_id: packageId },
      data,
    });
  },

  async softDelete(packageId, userId) {
    return prisma.mst_packages.update({
      where: { package_id: packageId },
      data: {
        is_active: false,
        updated_by: userId,
        updated_at_utc: new Date(),
      },
    });
  },

  async updateStats(packageId) {
    const count = await prisma.mst_package_courses.count({
      where: { package_id: packageId },
    });

    return prisma.mst_packages.update({
      where: { package_id: packageId },
      data: { total_courses: count },
    });
  },

  async findPackageCourse(packageId, subjectId) {
    return prisma.mst_package_courses.findUnique({
      where: {
        package_id_subject_id: { package_id: packageId, subject_id: subjectId },
      },
    });
  },

  async getMaxCourseOrder(packageId) {
    const result = await prisma.mst_package_courses.findFirst({
      where: { package_id: packageId },
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    });

    return result?.display_order ?? 0;
  },

  async addCourse(data) {
    return prisma.mst_package_courses.create({ data });
  },

  async removeCourse(packageId, subjectId) {
    return prisma.mst_package_courses.delete({
      where: {
        package_id_subject_id: { package_id: packageId, subject_id: subjectId },
      },
    });
  },

  async updateCourseOrder(packageCourseId, displayOrder) {
    return prisma.mst_package_courses.update({
      where: { package_course_id: packageCourseId },
      data: { display_order: displayOrder },
    });
  },
};

module.exports = packageRepository;
