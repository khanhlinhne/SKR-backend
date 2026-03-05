const prisma = require("../config/prisma");

const documentRepository = {
  async create(data) {
    return prisma.cnt_documents.create({
      data: {
        document_title: data.documentTitle,
        document_description: data.documentDescription ?? null,
        file_name: data.fileName,
        file_url: data.fileUrl,
        file_type: data.fileType ?? null,
        file_size_bytes: data.fileSizeBytes ?? null,
        uploader_id: data.uploaderId,
        lesson_id: data.lessonId ?? null,
        subject_id: data.subjectId ?? null,
        visibility: data.visibility ?? "private",
        tags: data.tags ?? null,
        created_by: data.createdBy,
        status: data.status ?? "active",
      },
    });
  },

  async findById(documentId) {
    return prisma.cnt_documents.findUnique({
      where: { document_id: documentId },
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
    });
  },

  async findManyByUploader(uploaderId, { skip, take, where = {} }) {
    const baseWhere = { uploader_id: uploaderId, ...where };
    const [items, totalItems] = await prisma.$transaction([
      prisma.cnt_documents.findMany({
        where: baseWhere,
        orderBy: { created_at_utc: "desc" },
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
      prisma.cnt_documents.count({ where: baseWhere }),
    ]);
    return { items, totalItems };
  },
};

module.exports = documentRepository;
