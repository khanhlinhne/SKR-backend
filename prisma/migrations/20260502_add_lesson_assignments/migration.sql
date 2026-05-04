CREATE TABLE IF NOT EXISTS "lrn_lesson_assignments" (
  "assignment_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "subject_id" UUID NOT NULL,
  "chapter_id" UUID NOT NULL,
  "lesson_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "submission_format" TEXT,
  "review_focus" TEXT,
  "max_score" DECIMAL(7, 2) NOT NULL DEFAULT 100.00,
  "rubric_criteria" JSONB,
  "source_type" VARCHAR(50) DEFAULT 'manual',
  "created_by" UUID NOT NULL,
  "created_at_utc" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'::text),
  "updated_by" UUID,
  "updated_at_utc" TIMESTAMP(6),
  "status" VARCHAR(50) DEFAULT 'active',
  CONSTRAINT "lrn_lesson_assignments_pkey" PRIMARY KEY ("assignment_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lrn_lesson_assignments_lesson_id_key"
  ON "lrn_lesson_assignments" ("lesson_id");

CREATE INDEX IF NOT EXISTS "idx_lesson_assignments_subject"
  ON "lrn_lesson_assignments" ("subject_id");

CREATE INDEX IF NOT EXISTS "idx_lesson_assignments_chapter"
  ON "lrn_lesson_assignments" ("chapter_id");

CREATE INDEX IF NOT EXISTS "idx_lesson_assignments_lesson"
  ON "lrn_lesson_assignments" ("lesson_id");

CREATE INDEX IF NOT EXISTS "idx_lesson_assignments_status"
  ON "lrn_lesson_assignments" ("status");

ALTER TABLE "lrn_lesson_assignments"
  ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(50) DEFAULT 'manual';

ALTER TABLE "lrn_lesson_assignments"
  DROP CONSTRAINT IF EXISTS "fk_lesson_assignments_subject";

ALTER TABLE "lrn_lesson_assignments"
  ADD CONSTRAINT "fk_lesson_assignments_subject"
  FOREIGN KEY ("subject_id")
  REFERENCES "mst_subjects"("subject_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_lesson_assignments"
  DROP CONSTRAINT IF EXISTS "fk_lesson_assignments_chapter";

ALTER TABLE "lrn_lesson_assignments"
  ADD CONSTRAINT "fk_lesson_assignments_chapter"
  FOREIGN KEY ("chapter_id")
  REFERENCES "mst_chapters"("chapter_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_lesson_assignments"
  DROP CONSTRAINT IF EXISTS "fk_lesson_assignments_lesson";

ALTER TABLE "lrn_lesson_assignments"
  ADD CONSTRAINT "fk_lesson_assignments_lesson"
  FOREIGN KEY ("lesson_id")
  REFERENCES "mst_lessons"("lesson_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

CREATE TABLE IF NOT EXISTS "lrn_assignment_submissions" (
  "submission_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "assignment_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "chapter_id" UUID NOT NULL,
  "lesson_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "answer_text" TEXT NOT NULL,
  "score" DECIMAL(7, 2),
  "max_score" DECIMAL(7, 2) DEFAULT 100.00,
  "summary" TEXT,
  "strengths" JSONB,
  "improvements" JSONB,
  "rubric_scores" JSONB,
  "submitted_at_utc" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'::text),
  "graded_at_utc" TIMESTAMP(6),
  "created_by" UUID NOT NULL,
  "created_at_utc" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'::text),
  "updated_by" UUID,
  "updated_at_utc" TIMESTAMP(6),
  "status" VARCHAR(50) DEFAULT 'graded',
  CONSTRAINT "lrn_assignment_submissions_pkey" PRIMARY KEY ("submission_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lrn_assignment_submissions_assignment_id_user_id_key"
  ON "lrn_assignment_submissions" ("assignment_id", "user_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_assignment"
  ON "lrn_assignment_submissions" ("assignment_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_subject"
  ON "lrn_assignment_submissions" ("subject_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_chapter"
  ON "lrn_assignment_submissions" ("chapter_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_lesson"
  ON "lrn_assignment_submissions" ("lesson_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_user"
  ON "lrn_assignment_submissions" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_submitted_at"
  ON "lrn_assignment_submissions" ("submitted_at_utc" DESC);

CREATE INDEX IF NOT EXISTS "idx_assignment_submissions_status"
  ON "lrn_assignment_submissions" ("status");

ALTER TABLE "lrn_assignment_submissions"
  ADD COLUMN IF NOT EXISTS "answer_text" TEXT,
  ADD COLUMN IF NOT EXISTS "max_score" DECIMAL(7, 2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "strengths" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "improvements" JSONB DEFAULT '[]'::jsonb;

UPDATE "lrn_assignment_submissions"
SET "answer_text" = COALESCE("answer_text", "submission_text", '')
WHERE "answer_text" IS NULL;

UPDATE "lrn_assignment_submissions"
SET
  "summary" = COALESCE("summary", "ai_feedback"),
  "strengths" = COALESCE("strengths", '[]'::jsonb),
  "improvements" = COALESCE("improvements", '[]'::jsonb),
  "max_score" = COALESCE("max_score", 100.00);

ALTER TABLE "lrn_assignment_submissions"
  DROP CONSTRAINT IF EXISTS "fk_assignment_submissions_assignment";

ALTER TABLE "lrn_assignment_submissions"
  ADD CONSTRAINT "fk_assignment_submissions_assignment"
  FOREIGN KEY ("assignment_id")
  REFERENCES "lrn_lesson_assignments"("assignment_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_assignment_submissions"
  DROP CONSTRAINT IF EXISTS "fk_assignment_submissions_subject";

ALTER TABLE "lrn_assignment_submissions"
  ADD CONSTRAINT "fk_assignment_submissions_subject"
  FOREIGN KEY ("subject_id")
  REFERENCES "mst_subjects"("subject_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_assignment_submissions"
  DROP CONSTRAINT IF EXISTS "fk_assignment_submissions_chapter";

ALTER TABLE "lrn_assignment_submissions"
  ADD CONSTRAINT "fk_assignment_submissions_chapter"
  FOREIGN KEY ("chapter_id")
  REFERENCES "mst_chapters"("chapter_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_assignment_submissions"
  DROP CONSTRAINT IF EXISTS "fk_assignment_submissions_lesson";

ALTER TABLE "lrn_assignment_submissions"
  ADD CONSTRAINT "fk_assignment_submissions_lesson"
  FOREIGN KEY ("lesson_id")
  REFERENCES "mst_lessons"("lesson_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_assignment_submissions"
  DROP CONSTRAINT IF EXISTS "fk_assignment_submissions_user";

ALTER TABLE "lrn_assignment_submissions"
  ADD CONSTRAINT "fk_assignment_submissions_user"
  FOREIGN KEY ("user_id")
  REFERENCES "mst_users"("user_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
