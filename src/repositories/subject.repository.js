const prisma = require("../config/prisma");

const subjectRepository = {
  async findMany({ where, orderBy, skip, take }) {
    const [items, totalItems] = await prisma.$transaction([
      prisma.mst_subjects.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          mst_users: {
            select: {
              user_id: true,
              full_name: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.mst_subjects.count({ where }),
    ]);

    return { items, totalItems };
  },

  async findById(subjectId) {
    return prisma.mst_subjects.findUnique({
      where: { subject_id: subjectId },
      include: {
        mst_users: {
          select: {
            user_id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
          },
        },
        mst_chapters: {
          where: { is_active: true },
          orderBy: { display_order: "asc" },
          select: {
            chapter_id: true,
            chapter_code: true,
            chapter_name: true,
            chapter_description: true,
            chapter_number: true,
            display_order: true,
            estimated_duration_minutes: true,
            mst_lessons: {
              where: { is_active: true },
              orderBy: { display_order: "asc" },
              select: {
                lesson_id: true,
                lesson_code: true,
                lesson_name: true,
                lesson_description: true,
                lesson_number: true,
                display_order: true,
              },
            },
          },
        },
      },
    });
  },
};

module.exports = subjectRepository;
