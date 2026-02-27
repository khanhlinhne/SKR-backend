function toUserResponse(user) {
  return {
    userId: user.user_id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    timezoneOffset: user.timezone_offset,
    emailVerified: user.email_verified,
    isActive: user.is_active,
    createdAt: user.created_at_utc,
  };
}

function toTokenResponse({ accessToken, refreshToken }) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
  };
}

function toLoginResponse(user, tokens) {
  return {
    user: toUserResponse(user),
    tokens: toTokenResponse(tokens),
  };
}

module.exports = {
  toUserResponse,
  toTokenResponse,
  toLoginResponse,
};
