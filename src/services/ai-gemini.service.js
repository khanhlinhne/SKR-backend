const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const AppError = require("../utils/AppError");
const aiQuestionGenerationRepository = require("../repositories/ai-question-generation.repository");

const MAX_CONTENT_CHARS = 48_000;

/** Logged-in user, or shared pool user from env — required by DB (non-null user_id). */
function effectiveUserIdForPersistence(requestUserId) {
  if (requestUserId) return requestUserId;
  const fallback = config.gemini.publicGenerationOwnerUserId;
  return fallback || null;
}
const MAX_QUESTIONS = 20;
const FALLBACK_FLASH_MODEL = "gemini-2.5-flash";
const MODELS_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models";

let genAI;
let resolvedModelIdCache = null;
let resolveModelPromise = null;

function isEffectiveAutoMode() {
  const m = config.gemini.model;
  if (!m || m === "auto" || m === "latest") return true;
  if (/flash-lite/i.test(m)) return true;
  return false;
}

/**
 * Lists Gemini models and picks the newest stable `gemini-*-flash` with generateContent (excludes *-lite).
 */
async function pickLatestFlashModelId(apiKey) {
  const collected = [];
  let pageToken;
  try {
    do {
      const params = { key: apiKey, pageSize: 100 };
      if (pageToken) params.pageToken = pageToken;
      const { data } = await axios.get(MODELS_LIST_URL, { params, timeout: 20000 });
      collected.push(...(data.models || []));
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (e) {
    console.warn("[Gemini] models.list failed, using fallback model:", e.message);
    return FALLBACK_FLASH_MODEL;
  }

  const candidates = collected
    .filter((m) => m.name && /^models\/gemini-[\d.]+-flash$/i.test(m.name))
    .filter((m) => !/lite|image|tts|live|embedding/i.test(m.name))
    .filter(
      (m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes("generateContent")
    );

  const score = (fullName) => {
    const short = fullName.replace(/^models\//, "");
    const match = short.match(/gemini-([\d.]+)/i);
    return match ? parseFloat(match[1]) : 0;
  };

  candidates.sort((a, b) => score(b.name) - score(a.name) || b.name.localeCompare(a.name));

  const best = candidates[0]?.name?.replace(/^models\//, "");
  if (best) {
    console.log(`[Gemini] GEMINI_MODEL=auto → using ${best}`);
    return best;
  }

  console.warn("[Gemini] No flash model in list, using fallback:", FALLBACK_FLASH_MODEL);
  return FALLBACK_FLASH_MODEL;
}

async function getResolvedModelId() {
  let configured = config.gemini.model;
  if (configured && configured !== "auto" && /flash-lite/i.test(configured)) {
    console.warn(
      "[Gemini] GEMINI_MODEL is *-lite (deprecated). Using auto (newest Flash from models.list)."
    );
    configured = "auto";
  }

  if (configured && configured !== "auto") {
    return configured;
  }

  if (resolvedModelIdCache) {
    return resolvedModelIdCache;
  }

  const apiKey = config.gemini?.apiKey?.trim();
  if (!apiKey) {
    throw AppError.serviceUnavailable("Gemini AI is not configured (missing GEMINI_API_KEY)");
  }

  if (!resolveModelPromise) {
    resolveModelPromise = pickLatestFlashModelId(apiKey).then((id) => {
      resolvedModelIdCache = id;
      resolveModelPromise = null;
      return id;
    });
  }

  return resolveModelPromise;
}

async function getGenerativeModelInstance() {
  const apiKey = config.gemini?.apiKey;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    throw AppError.serviceUnavailable("Gemini AI is not configured (missing GEMINI_API_KEY)");
  }

  const modelId = await getResolvedModelId();

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey.trim());
  }

  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  return { model, modelId };
}

const PRISMA_DIFFICULTIES = new Set(["easy", "medium", "hard", "expert"]);

function mapDifficultyToPrisma(value) {
  const v = typeof value === "string" ? value.toLowerCase().trim() : "medium";
  return PRISMA_DIFFICULTIES.has(v) ? v : "medium";
}

function truncate(text, max = MAX_CONTENT_CHARS) {
  if (typeof text !== "string") return "";
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}\n…[truncated]`;
}

function toGenerationListItem(row) {
  return {
    generationId: row.generation_id,
    sourceType: row.source_type,
    sourcePreview: row.source_content ? String(row.source_content).slice(0, 280) : null,
    quantityRequested: row.quantity_requested,
    quantityGenerated: row.quantity_generated,
    difficultyLevel: row.difficulty_level,
    languageCode: row.language_code,
    aiModel: row.ai_model,
    status: row.status,
    userReviewed: row.user_reviewed,
    createdAt: row.created_at_utc,
  };
}

function toGenerationDetail(row) {
  return {
    generationId: row.generation_id,
    sourceType: row.source_type,
    sourceContent: row.source_content,
    quantityRequested: row.quantity_requested,
    quantityGenerated: row.quantity_generated,
    generatedQuestions: row.generated_questions,
    difficultyLevel: row.difficulty_level,
    questionType: row.question_type,
    languageCode: row.language_code,
    aiModel: row.ai_model,
    aiProvider: row.ai_provider,
    status: row.status,
    userReviewed: row.user_reviewed,
    errorMessage: row.error_message,
    createdAt: row.created_at_utc,
    updatedAt: row.updated_at_utc,
  };
}

function parseJsonSafe(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function normalizeAssignmentRubricCriteria(criteria, maxScore, criteriaCount = 4) {
  const rawItems = Array.isArray(criteria) ? criteria : [];
  const fallbackCount = Math.max(2, Math.min(6, Number(criteriaCount) || 4));
  const fallbackPoints = Math.floor(maxScore / fallbackCount);
  const fallback = Array.from({ length: fallbackCount }, (_item, index) => ({
    title: `Tieu chi ${index + 1}`,
    description: "Danh gia muc do dap ung yeu cau cua de bai.",
    maxPoints: index === fallbackCount - 1
      ? maxScore - fallbackPoints * (fallbackCount - 1)
      : fallbackPoints,
  }));

  return (rawItems.length ? rawItems : fallback)
    .map((item, index) => ({
      criterionId: String(item?.criterionId || item?.id || `criterion-${index + 1}`),
      title: String(item?.title || item?.criterionTitle || `Tieu chi ${index + 1}`).trim(),
      description: String(item?.description || item?.criterionDescription || "").trim(),
      maxPoints: Math.max(0, Number(item?.maxPoints ?? item?.points ?? item?.score ?? 0) || 0),
    }))
    .filter((item) => item.title);
}

function normalizeAssignmentDraft(assignment, criteriaCount = 4) {
  const maxScore = Math.max(1, Number(assignment?.maxScore) || 100);
  const rubricCriteria = normalizeAssignmentRubricCriteria(
    assignment?.rubricCriteria,
    maxScore,
    criteriaCount
  );

  return {
    title: String(assignment?.title || "").trim(),
    description: String(assignment?.description || "").trim(),
    instructions: String(assignment?.instructions || "").trim(),
    submissionFormat: String(assignment?.submissionFormat || "Tra loi bang van ban.").trim(),
    reviewFocus: String(assignment?.reviewFocus || "").trim(),
    maxScore,
    rubricCriteria,
    sourceType: "ai",
  };
}

/**
 * Maps Google Generative AI SDK / HTTP errors to AppError (400 model, 429 quota, 502 other).
 */
function mapGeminiApiError(err) {
  const msg = typeof err?.message === "string" ? err.message : String(err);
  const is404Model =
    err?.status === 404 ||
    /\[404\b/i.test(msg) ||
    /no longer available/i.test(msg);

  if (is404Model) {
    return AppError.badRequest(
      "Model Gemini không hợp lệ hoặc đã ngừng cho API key này. " +
        "Đặt GEMINI_MODEL=auto (mặc định, chọn Flash mới nhất) hoặc tên cụ thể; tránh *-lite cũ. " +
        "https://ai.google.dev/gemini-api/docs/models"
    );
  }

  const is429 =
    err?.status === 429 ||
    /\[429\b/i.test(msg) ||
    /Too Many Requests/i.test(msg) ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /quota exceeded/i.test(msg) ||
    /rate limit/i.test(msg);

  if (is429) {
    const retryHint = msg.match(/retry in ([\d.]+)s/i);
    const retryPart = retryHint ? ` Thử lại sau khoảng ${Math.ceil(Number(retryHint[1]))} giây.` : "";
    return AppError.tooManyRequests(
      `Gemini: hết quota hoặc vượt giới hạn gọi API (thường gặp ở free tier).${retryPart} ` +
        `Hướng xử lý: đợi hoặc bật billing trên Google AI Studio; thử đổi GEMINI_MODEL (ví dụ gemini-2.5-flash). ` +
        `Tài liệu: https://ai.google.dev/gemini-api/docs/rate-limits`
    );
  }

  return AppError.badGateway(msg || "Gemini API request failed");
}

/**
 * Flow 1 — AI Generate Question: tạo bộ câu hỏi trắc nghiệm từ nội dung (draft để user review).
 */
async function generateQuestionsFromContent({
  content,
  questionCount = 5,
  difficulty = "medium",
  language = "vi",
  userId,
}) {
  const n = Math.min(Math.max(Number(questionCount) || 5, 1), MAX_QUESTIONS);
  const { model, modelId } = await getGenerativeModelInstance();

  const prompt = `You are an expert educator. Based ONLY on the source material below, create exactly ${n} multiple-choice quiz questions.
Rules:
- Output MUST be valid JSON only, no markdown outside JSON.
- Language for questions and options: ${language === "vi" ? "Vietnamese" : "English"}.
- Difficulty: ${difficulty}.
- Each question has exactly 4 options, one correct (isCorrect: true).
- Include a short "explanation" per question (why the correct answer is right).
- JSON schema:
{
  "questions": [
    {
      "questionText": "string",
      "questionType": "multiple_choice",
      "difficultyLevel": "${difficulty}",
      "options": [
        { "optionText": "string", "isCorrect": true, "optionOrder": 0 },
        { "optionText": "string", "isCorrect": false, "optionOrder": 1 },
        { "optionText": "string", "isCorrect": false, "optionOrder": 2 },
        { "optionText": "string", "isCorrect": false, "optionOrder": 3 }
      ],
      "explanation": "string"
    }
  ]
}

SOURCE MATERIAL:
---
${truncate(content)}
---
`;

  let text;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e) {
    throw mapGeminiApiError(e);
  }
  const parsed = parseJsonSafe(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw AppError.badGateway("AI returned invalid JSON; try again with shorter content.");
  }

  const questions = parsed.questions;
  let generationId = null;
  let persisted = false;
  let dbRecord = null;
  let persistError = null;
  let persistSkippedReason = null;

  const persistAsUserId = effectiveUserIdForPersistence(userId);

  if (!persistAsUserId) {
    persistSkippedReason = "no_user_context";
  } else {
    try {
      const row = await aiQuestionGenerationRepository.create({
        userId: persistAsUserId,
        createdBy: persistAsUserId,
        sourceType: "gemini_text",
        sourceContent: truncate(content, 50_000),
        quantityRequested: n,
        quantityGenerated: questions.length,
        generatedQuestions: questions,
        difficultyLevel: mapDifficultyToPrisma(difficulty),
        questionType: "multiple_choice",
        languageCode: language === "vi" ? "vi" : "en",
        aiModel: modelId,
        aiProvider: "google_gemini",
        status: "completed",
      });
      generationId = row.generation_id;
      persisted = true;
      dbRecord = {
        generationId: row.generation_id,
        userId: row.user_id,
        createdAtUtc: row.created_at_utc,
        status: row.status,
      };
      console.log(
        `[Gemini][generate-questions] DB saved ai_question_generations generation_id=${row.generation_id}`
      );
    } catch (e) {
      persistError = e.message || String(e);
      console.warn("[Gemini] Failed to persist ai_question_generations:", persistError);
    }
  }

  const logQuestionsVerbose =
    config.nodeEnv !== "production" || process.env.AI_LOG_GENERATED_QUESTIONS === "true";
  console.log(
    `[Gemini][generate-questions] ${questions.length} questions | generationId=${generationId ?? "null"} | persisted=${persisted} | model=${modelId}`
  );
  if (logQuestionsVerbose) {
    console.log("[Gemini][generate-questions] questions:\n", JSON.stringify(questions, null, 2));
  }

  return {
    draftId: `draft_${Date.now()}`,
    generationId,
    persisted,
    /** Mirrors persisted — explicit for clients checking DB save */
    savedToDatabase: persisted,
    dbRecord,
    persistSkippedReason,
    persistError,
    status: "pending_review",
    questions,
    meta: {
      model: modelId,
      selectionMode: isEffectiveAutoMode() ? "auto" : "explicit",
      questionCount: questions.length,
    },
  };
}

/**
 * Flow 2 — Review AI Generated Content: chỉnh sửa / làm theo góp ý của user trước khi publish.
 */
async function refineQuestionsForReview({
  questions,
  reviewNotes,
  language = "vi",
  userId,
  generationId,
}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw AppError.badRequest("questions must be a non-empty array");
  }
  const { model, modelId } = await getGenerativeModelInstance();

  const prompt = `You are an expert editor for educational quizzes. The user reviewed AI-generated questions and asks for these changes:

USER REVIEW NOTES:
${truncate(String(reviewNotes || "Improve clarity and fix any errors."), 8000)}

Return the FULL revised list of questions as JSON (same structure as input). Keep the same number of questions unless the user explicitly asks to add/remove.
Input questions (JSON):
${JSON.stringify(questions).slice(0, 120_000)}

Output JSON schema:
{
  "questions": [
    {
      "questionText": "string",
      "questionType": "multiple_choice",
      "difficultyLevel": "string",
      "options": [
        { "optionText": "string", "isCorrect": boolean, "optionOrder": number }
      ],
      "explanation": "string"
    }
  ]
}
Language: ${language === "vi" ? "Vietnamese" : "English"}.
`;

  let text;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e) {
    throw mapGeminiApiError(e);
  }
  const parsed = parseJsonSafe(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw AppError.badGateway("AI could not refine questions; try simpler review notes.");
  }

  const refined = parsed.questions;
  let persisted = false;
  let persistError = null;
  let persistSkippedReason = null;

  const persistAsUserId = effectiveUserIdForPersistence(userId);

  if (!persistAsUserId) {
    persistSkippedReason = "no_user_context";
  } else if (!generationId) {
    persistSkippedReason = "missing_generation_id";
  } else if (persistAsUserId && generationId) {
    try {
      persisted = await aiQuestionGenerationRepository.updateGeneratedQuestions(
        generationId,
        persistAsUserId,
        {
          generatedQuestions: refined,
          quantityGenerated: refined.length,
        }
      );
      if (!persisted) {
        persistError =
          "No row updated — generationId not found or does not belong to this user (user_id mismatch)";
        console.warn("[Gemini] refine: " + persistError);
      } else {
        console.log(`[Gemini][refine-questions] DB updated ai_question_generations generation_id=${generationId}`);
      }
    } catch (e) {
      persistError = e.message || String(e);
      console.warn("[Gemini] Failed to update ai_question_generations:", persistError);
    }
  }

  return {
    generationId: generationId || null,
    persisted: Boolean(persisted),
    savedToDatabase: Boolean(persisted),
    persistSkippedReason,
    persistError,
    status: "pending_review",
    questions: refined,
    meta: { model: modelId, selectionMode: isEffectiveAutoMode() ? "auto" : "explicit" },
  };
}

/**
 * Flow 3 — AI Explanation: giải thích câu hỏi (sau khi làm bài hoặc khi xem đáp án).
 */
async function explainQuestion({
  questionText,
  options = [],
  correctAnswerSummary,
  userAnswerSummary,
  context,
  language = "vi",
}) {
  if (!questionText || typeof questionText !== "string") {
    throw AppError.badRequest("questionText is required");
  }
  const { model, modelId } = await getGenerativeModelInstance();

  const prompt = `Explain the following quiz question for a learner. Be concise and educational.
Language: ${language === "vi" ? "Vietnamese" : "English"}.

Question:
${truncate(questionText, 8000)}

${options.length ? `Options:\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}` : ""}

${correctAnswerSummary ? `Correct answer: ${correctAnswerSummary}` : ""}
${userAnswerSummary ? `Learner's answer: ${userAnswerSummary}` : ""}
${context ? `Extra context:\n${truncate(context, 4000)}` : ""}

Return JSON only:
{ "explanation": "string", "keyPoints": ["string"] }
`;

  let text;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e) {
    throw mapGeminiApiError(e);
  }
  const parsed = parseJsonSafe(text);
  if (!parsed || typeof parsed.explanation !== "string") {
    throw AppError.badGateway("AI could not generate an explanation.");
  }

  return {
    explanation: parsed.explanation,
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    meta: { model: modelId, selectionMode: isEffectiveAutoMode() ? "auto" : "explicit" },
  };
}

async function generateAssignmentDraft({
  topic,
  criteriaCount = 4,
  contextTitle = "",
  language = "vi",
}) {
  const trimmedTopic = String(topic || "").trim();
  if (!trimmedTopic) {
    throw AppError.badRequest("topic is required");
  }

  const count = Math.max(2, Math.min(6, Number(criteriaCount) || 4));
  const { model, modelId } = await getGenerativeModelInstance();
  const prompt = `You are an expert instructional designer.
Language: ${language === "en" ? "English" : "Vietnamese"}.

Create one practical learner assignment from the topic below.
Return valid JSON only, no markdown.

JSON schema:
{
  "assignment": {
    "title": "string",
    "description": "string",
    "instructions": "string",
    "submissionFormat": "string",
    "maxScore": 100,
    "reviewFocus": "string",
    "rubricCriteria": [
      {
        "criterionId": "criterion-1",
        "title": "string",
        "description": "string",
        "maxPoints": number
      }
    ]
  }
}

Rules:
- Create exactly ${count} rubric criteria.
- Rubric maxPoints must sum to 100.
- Make the assignment specific, assessable, and suitable for a course lesson.
- Do not include markdown fences.

Context title: ${truncate(String(contextTitle || ""), 1000)}
Topic:
---
${truncate(trimmedTopic, 18000)}
---`;

  let text;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e) {
    throw mapGeminiApiError(e);
  }

  const parsed = parseJsonSafe(text);
  const assignment = normalizeAssignmentDraft(parsed?.assignment, count);

  if (!assignment.title || !assignment.description || assignment.rubricCriteria.length === 0) {
    throw AppError.badGateway("Gemini returned invalid assignment JSON.");
  }

  return {
    assignment,
    meta: {
      model: modelId,
      selectionMode: isEffectiveAutoMode() ? "auto" : "explicit",
    },
  };
}

async function gradeAssignmentSubmission({
  assignment,
  answerText,
  language = "vi",
}) {
  if (!assignment || typeof assignment !== "object") {
    throw AppError.badRequest("assignment is required");
  }
  if (!answerText || typeof answerText !== "string") {
    throw AppError.badRequest("answerText is required");
  }

  const { model, modelId } = await getGenerativeModelInstance();
  const maxScore = Number(assignment.maxScore || 100) || 100;
  const rubric = Array.isArray(assignment.rubricCriteria) ? assignment.rubricCriteria : [];

  const prompt = `You are an expert assignment grader.
Language: ${language === "en" ? "English" : "Vietnamese"}.

Grade the learner submission strictly against the assignment and rubric.
Return valid JSON only, no markdown.

JSON schema:
{
  "grade": {
    "score": number,
    "maxScore": ${maxScore},
    "summary": "string",
    "strengths": ["string"],
    "improvements": ["string"],
    "rubricScores": [
      {
        "criterionId": "string",
        "criterionTitle": "string",
        "awardedPoints": number,
        "maxPoints": number,
        "feedback": "string"
      }
    ]
  }
}

Assignment:
${JSON.stringify({
    title: assignment.title,
    description: assignment.description,
    instructions: assignment.instructions,
    submissionFormat: assignment.submissionFormat,
    reviewFocus: assignment.reviewFocus,
    maxScore,
    rubricCriteria: rubric,
  }, null, 2)}

Learner submission:
---
${truncate(answerText, 24000)}
---`;

  let text;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e) {
    throw mapGeminiApiError(e);
  }

  const parsed = parseJsonSafe(text);
  const grade = parsed?.grade;
  if (!grade || typeof grade !== "object") {
    throw AppError.badGateway("Gemini returned invalid assignment grade JSON.");
  }

  const rubricScores = Array.isArray(grade.rubricScores)
    ? grade.rubricScores.map((item, index) => {
        const sourceCriterion = rubric[index] || {};
        const maxPoints = Number(item.maxPoints ?? sourceCriterion.maxPoints ?? 0) || 0;
        return {
          criterionId: String(item.criterionId || sourceCriterion.criterionId || `criterion-${index + 1}`),
          criterionTitle: String(item.criterionTitle || sourceCriterion.title || `Tieu chi ${index + 1}`),
          awardedPoints: Math.max(0, Math.min(Number(item.awardedPoints) || 0, maxPoints || maxScore)),
          maxPoints,
          feedback: String(item.feedback || ""),
        };
      })
    : [];

  return {
    score: Math.max(0, Math.min(Number(grade.score) || 0, maxScore)),
    maxScore,
    summary: String(grade.summary || ""),
    strengths: Array.isArray(grade.strengths) ? grade.strengths.map(String).filter(Boolean) : [],
    improvements: Array.isArray(grade.improvements) ? grade.improvements.map(String).filter(Boolean) : [],
    rubricScores,
    aiModel: modelId,
    aiProvider: "google_gemini",
  };
}

async function listGenerations(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const userId = query.userId && String(query.userId).trim() ? String(query.userId).trim() : undefined;

  const { items, totalItems } = await aiQuestionGenerationRepository.findMany({
    userId,
    skip,
    take: limit,
    status: query.status || undefined,
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  const mappedItems = items.map(toGenerationListItem);

  return {
    items: mappedItems,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    ...(totalItems === 0
      ? {
          hint:
            "Chưa có bản ghi. Cách lưu: (1) Gọi POST /api/ai-gemini/generate-questions kèm Authorization: Bearer <token>, hoặc (2) đặt biến môi trường AI_PUBLIC_GENERATION_OWNER_USER_ID = một user_id hợp lệ trong mst_users để lưu cả khi không đăng nhập — mọi người đều xem được qua GET này.",
        }
      : {}),
  };
}

async function getGenerationById(generationId) {
  const row = await aiQuestionGenerationRepository.findById(generationId);
  if (!row) {
    throw AppError.notFound("AI question generation not found");
  }
  return toGenerationDetail(row);
}

module.exports = {
  generateQuestionsFromContent,
  refineQuestionsForReview,
  explainQuestion,
  generateAssignmentDraft,
  gradeAssignmentSubmission,
  listGenerations,
  getGenerationById,
};
