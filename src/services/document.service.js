const AppError = require("../utils/AppError");
const documentRepository = require("../repositories/document.repository");

const VALID_VISIBILITY = ["public", "private", "premium_only", "unlisted"];

function toListItem(doc) {
  return {
    documentId: doc.document_id,
    documentTitle: doc.document_title,
    documentDescription: doc.document_description,
    fileName: doc.file_name,
    fileUrl: doc.file_url,
    fileType: doc.file_type,
    fileSizeBytes: doc.file_size_bytes,
    uploaderId: doc.uploader_id,
    lessonId: doc.lesson_id,
    subjectId: doc.subject_id,
    visibility: doc.visibility,
    tags: doc.tags,
    downloadCount: doc.download_count,
    viewCount: doc.view_count,
    status: doc.status,
    createdAt: doc.created_at_utc,
    updatedAt: doc.updated_at_utc,
    uploader: doc.mst_users
      ? {
          userId: doc.mst_users.user_id,
          fullName: doc.mst_users.full_name,
          displayName: doc.mst_users.display_name,
          avatarUrl: doc.mst_users.avatar_url,
        }
      : null,
  };
}

const documentService = {
  async uploadDocument(userId, file, body = {}) {
    if (!file || !file.path) {
      throw AppError.badRequest("No document file provided");
    }

    const visibility = body.visibility ?? "private";
    if (VALID_VISIBILITY.indexOf(visibility) === -1) {
      throw AppError.badRequest("Invalid visibility");
    }

    const fileUrl = `/uploads/documents/${file.filename}`;

    const doc = await documentRepository.create({
      documentTitle: body.documentTitle || file.originalname || file.filename,
      documentDescription: body.documentDescription,
      fileName: file.originalname || file.filename,
      fileUrl,
      fileType: file.mimetype,
      fileSizeBytes: file.size != null ? BigInt(file.size) : null,
      uploaderId: userId,
      lessonId: body.lessonId,
      subjectId: body.subjectId,
      visibility,
      tags: body.tags,
      createdBy: userId,
      status: "active",
    });

    const full = await documentRepository.findById(doc.document_id);
    return toListItem(full);
  },

  async getMyDocuments(userId, query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const where = {};
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;

    const { items, totalItems } = await documentRepository.findManyByUploader(userId, {
      where,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(toListItem),
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

  async getDocumentById(documentId, userId) {
    const doc = await documentRepository.findById(documentId);
    if (!doc) throw AppError.notFound("Document not found");
    if (doc.uploader_id !== userId && doc.visibility === "private") {
      throw AppError.forbidden("You do not have access to this document");
    }
    return toListItem(doc);
  },
};

module.exports = documentService;
