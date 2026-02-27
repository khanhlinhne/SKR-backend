const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const userRepository = require("../repositories/user.repository");
const userDto = require("../dtos/user.dto");

const userService = {
  async getProfile(userId) {
    const user = await userRepository.findByIdWithRoles(userId);
    if (!user || !user.is_active) {
      throw AppError.notFound("User not found");
    }
    return userDto.toProfileResponse(user);
  },

  async updateProfile(userId, data) {
    if (data.username !== undefined) {
      const existing = await userRepository.findByUsername(data.username);
      if (existing && existing.user_id !== userId) {
        throw AppError.conflict("Username already taken");
      }
    }

    const updateData = {};
    if (data.fullName !== undefined) {
      updateData.full_name = data.fullName;
      const parts = data.fullName.trim().split(/\s+/);
      updateData.display_name = parts[parts.length - 1] || data.fullName;
    }
    if (data.username !== undefined) updateData.username = data.username;
    if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.timezoneOffset !== undefined) updateData.timezone_offset = data.timezoneOffset;
    if (data.dateOfBirth !== undefined) {
      updateData.date_of_birth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }

    const updatedUser = await userRepository.update(userId, updateData);

    const userWithRoles = await userRepository.findByIdWithRoles(updatedUser.user_id);
    return userDto.toProfileResponse(userWithRoles);
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findById(userId);
    if (!user || !user.is_active) {
      throw AppError.notFound("User not found");
    }

    if (!user.password_hash) {
      throw AppError.badRequest("This account uses social login. Password cannot be changed here.");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw AppError.badRequest("Current password is incorrect");
    }

    const isSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isSame) {
      throw AppError.badRequest("New password must be different from the current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.update(userId, { password_hash: passwordHash });

    return { message: "Password changed successfully" };
  },
};

module.exports = userService;
