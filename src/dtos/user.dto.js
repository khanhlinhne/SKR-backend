function toProfileResponse(user) {
  const roles = user.mst_user_roles
    ? user.mst_user_roles
        .filter((ur) => ur.mst_roles)
        .map((ur) => ({
          roleCode: ur.mst_roles.role_code,
          roleName: ur.mst_roles.role_name,
          roleLevel: ur.mst_roles.role_level,
        }))
    : [];

  return {
    userId: user.user_id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    phoneNumber: user.phone_number,
    dateOfBirth: user.date_of_birth,
    bio: user.bio,
    timezoneOffset: user.timezone_offset,
    emailVerified: user.email_verified,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at_utc,
    createdAt: user.created_at_utc,
    updatedAt: user.updated_at_utc,
    roles,
  };
}

module.exports = { toProfileResponse };
