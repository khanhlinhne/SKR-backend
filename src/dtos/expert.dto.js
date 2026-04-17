function toListItem(row) {
  const u = row.mst_users;
  return {
    expertId: row.expert_id,
    userId: row.user_id,
    headline: row.headline,
    expertiseSummary: row.expertise_summary,
    subjectCourseIds: row.subject_course_ids,
    displayOrder: row.display_order,
    status: row.status,
    createdAtUtc: row.created_at_utc,
    user: u
      ? {
          email: u.email,
          fullName: u.full_name,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
          bio: u.bio,
        }
      : null,
  };
}

function toDetail(row) {
  return toListItem(row);
}

module.exports = { toListItem, toDetail };
