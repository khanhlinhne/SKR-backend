CREATE TABLE "lrn_subject_lesson_progress" (
  "progress_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "purchase_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "chapter_id" UUID,
  "lesson_id" UUID NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completed_at_utc" TIMESTAMP(6),
  "created_by" UUID NOT NULL,
  "created_at_utc" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'::text),
  "updated_by" UUID,
  "updated_at_utc" TIMESTAMP(6),
  "status" VARCHAR(50) DEFAULT 'active',
  CONSTRAINT "lrn_subject_lesson_progress_pkey" PRIMARY KEY ("progress_id")
);

CREATE UNIQUE INDEX "lrn_subject_lesson_progress_purchase_id_lesson_id_key"
  ON "lrn_subject_lesson_progress" ("purchase_id", "lesson_id");

CREATE INDEX "idx_lesson_progress_purchase"
  ON "lrn_subject_lesson_progress" ("purchase_id");

CREATE INDEX "idx_lesson_progress_subject_user"
  ON "lrn_subject_lesson_progress" ("subject_id", "user_id");

CREATE INDEX "idx_lesson_progress_lesson"
  ON "lrn_subject_lesson_progress" ("lesson_id");

CREATE INDEX "idx_lesson_progress_chapter"
  ON "lrn_subject_lesson_progress" ("chapter_id");

ALTER TABLE "lrn_subject_lesson_progress"
  ADD CONSTRAINT "fk_lesson_progress_purchase"
  FOREIGN KEY ("purchase_id")
  REFERENCES "pmt_subject_purchases"("purchase_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_subject_lesson_progress"
  ADD CONSTRAINT "fk_lesson_progress_subject"
  FOREIGN KEY ("subject_id")
  REFERENCES "mst_subjects"("subject_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_subject_lesson_progress"
  ADD CONSTRAINT "fk_lesson_progress_user"
  FOREIGN KEY ("user_id")
  REFERENCES "mst_users"("user_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_subject_lesson_progress"
  ADD CONSTRAINT "fk_lesson_progress_chapter"
  FOREIGN KEY ("chapter_id")
  REFERENCES "mst_chapters"("chapter_id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

ALTER TABLE "lrn_subject_lesson_progress"
  ADD CONSTRAINT "fk_lesson_progress_lesson"
  FOREIGN KEY ("lesson_id")
  REFERENCES "mst_lessons"("lesson_id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
