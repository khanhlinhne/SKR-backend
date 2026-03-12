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

module.exports = {
  setToListItem,
  setToDetail,
  itemToResponse,
};
