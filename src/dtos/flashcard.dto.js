function setToListItem(set) {
  return {
    flashcardSetId: set.flashcard_set_id,
    setTitle: set.set_title,
    setDescription: set.set_description,
    setCoverImageUrl: set.set_cover_image_url,
    creatorId: set.creator_id,
    lessonId: set.lesson_id,
    courseId: set.course_id,
    visibility: set.visibility,
    tags: set.tags,
    totalCards: set.total_cards ?? set._count?.cnt_flashcard_items ?? 0,
    masteredCount: Number(set.masteredCount ?? set.mastered_count ?? 0),
    dueToday: Number(set.dueToday ?? set.due_today ?? 0),
    timesStudied: set.times_studied,
    averageRating: set.average_rating,
    status: set.status,
    createdAt: set.created_at_utc,
    updatedAt: set.updated_at_utc,
    creator: set.mst_users
      ? {
          userId: set.mst_users.user_id,
          fullName: set.mst_users.full_name,
          displayName: set.mst_users.display_name,
          avatarUrl: set.mst_users.avatar_url,
        }
      : null,
  };
}

function setToDetail(set) {
  return {
    flashcardSetId: set.flashcard_set_id,
    setTitle: set.set_title,
    setDescription: set.set_description,
    setCoverImageUrl: set.set_cover_image_url,
    creatorId: set.creator_id,
    lessonId: set.lesson_id,
    courseId: set.course_id,
    visibility: set.visibility,
    tags: set.tags,
    totalCards: set.total_cards,
    masteredCount: Number(set.masteredCount ?? set.mastered_count ?? 0),
    dueToday: Number(set.dueToday ?? set.due_today ?? 0),
    timesStudied: set.times_studied,
    averageRating: set.average_rating,
    status: set.status,
    createdAt: set.created_at_utc,
    updatedAt: set.updated_at_utc,
    creator: set.mst_users
      ? {
          userId: set.mst_users.user_id,
          fullName: set.mst_users.full_name,
          displayName: set.mst_users.display_name,
          avatarUrl: set.mst_users.avatar_url,
        }
      : null,
    items: (set.cnt_flashcard_items || []).map(itemToResponse),
  };
}

function itemToResponse(item) {
  return {
    flashcardItemId: item.flashcard_item_id,
    flashcardSetId: item.flashcard_set_id,
    frontText: item.front_text,
    backText: item.back_text,
    frontImageUrl: item.front_image_url,
    backImageUrl: item.back_image_url,
    cardOrder: item.card_order,
    hintText: item.hint_text,
    easeFactor: item.ease_factor,
    intervalDays: item.interval_days,
    status: item.status,
    createdAt: item.created_at_utc,
    updatedAt: item.updated_at_utc,
  };
}

function sessionToResponse(session) {
  if (!session) return null;

  return {
    sessionId: session.session_id,
    flashcardSetId: session.flashcard_set_id,
    totalCards: session.total_cards,
    cardsReviewed: session.cards_reviewed ?? 0,
    cardsMastered: session.cards_mastered ?? 0,
    cardsLearning: session.cards_learning ?? 0,
    cardsNew: session.cards_new ?? 0,
    startedAt: session.started_at_utc,
    endedAt: session.ended_at_utc,
    sessionDurationSeconds: session.session_duration_seconds ?? 0,
    status: session.status,
  };
}

function reviewToResponse(review) {
  if (!review) return null;

  return {
    reviewId: review.review_id,
    sessionId: review.session_id,
    flashcardItemId: review.flashcard_item_id,
    userRating: review.user_rating,
    wasCorrect: review.was_correct,
    timeToAnswerSeconds: review.time_to_answer_seconds ?? 0,
    previousEaseFactor: review.previous_ease_factor != null ? Number(review.previous_ease_factor) : null,
    newEaseFactor: review.new_ease_factor != null ? Number(review.new_ease_factor) : null,
    previousIntervalDays: review.previous_interval_days ?? 0,
    newIntervalDays: review.new_interval_days ?? 0,
    nextReviewAt: review.next_review_at_utc,
    status: review.status,
    createdAt: review.created_at_utc,
    updatedAt: review.updated_at_utc,
  };
}

module.exports = {
  setToListItem,
  setToDetail,
  itemToResponse,
  sessionToResponse,
  reviewToResponse,
};
