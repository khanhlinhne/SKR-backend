const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const userRepository = require("../repositories/user.repository");
const roleRepository = require("../repositories/role.repository");
const verificationRepository = require("../repositories/verification.repository");
const emailService = require("./email.service");
const userDto = require("../dtos/user.dto");

const config = require("../config");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpExpiresAt() {
  return new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000);
}

const ALLOWED_SORT_FIELDS = {
  createdAt: "created_at_utc",
  email: "email",
  fullName: "full_name",
  username: "username",
  lastLoginAt: "last_login_at_utc",
};

const userService = {
  async createUser({ email, username, password, fullName, phoneNumber, roles }, adminId) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw AppError.conflict("Email already exists");
    }

    if (username) {
      const existingUsername = await userRepository.findByUsername(username);
      if (existingUsername) {
        throw AppError.conflict("Username already exists");
      }
    }

    // Resolve role names/codes to role IDs
    let roleIds = [];
    if (roles && roles.length > 0) {
      const foundRoles = await roleRepository.findByCodes(roles);
      if (foundRoles.length === 0) {
        throw AppError.badRequest("No valid roles found");
      }
      roleIds = foundRoles.map((r) => r.role_id);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Derive displayName from fullName
    let displayName = null;
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      displayName = parts[parts.length - 1] || fullName;
    }

    const user = await userRepository.create({
      email,
      username: username || email.split("@")[0],
      passwordHash,
      fullName,
      displayName,
      phoneNumber,
      emailVerified: true, // Admin-created accounts are pre-verified
      createdBy: adminId,
    });

    // Assign roles
    if (roleIds.length > 0) {
      await userRepository.assignRoles(user.user_id, roleIds, adminId);
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, fullName, password);
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr.message);
      // Don't fail the whole operation if email fails
    }

    const userWithRoles = await userRepository.findByIdWithRoles(user.user_id);
    return userDto.toAdminListItem(userWithRoles);
  },

  async updateUserStatus(userId, { isActive }, adminId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    await userRepository.update(userId, { is_active: isActive }, adminId);
    return { message: isActive ? "Tai khoan da duoc mo khoa" : "Tai khoan da bi khoa" };
  },

  async getUserByIdForAdmin(userId) {
    const user = await userRepository.findByIdWithRoles(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return userDto.toProfileResponse(user);
  },

  async updateUserByAdmin(targetUserId, body, adminId) {
    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw AppError.notFound("User not found");
    }

    if (body.email !== undefined && body.email !== existing.email) {
      const byEmail = await userRepository.findByEmail(body.email);
      if (byEmail && byEmail.user_id !== targetUserId) {
        throw AppError.conflict("Email already exists");
      }
    }

    if (body.username !== undefined) {
      const byUsername = await userRepository.findByUsername(body.username);
      if (byUsername && byUsername.user_id !== targetUserId) {
        throw AppError.conflict("Username already taken");
      }
    }

    const updateData = {};

    if (body.email !== undefined) updateData.email = body.email;
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phoneNumber !== undefined) updateData.phone_number = body.phoneNumber;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;
    if (body.timezoneOffset !== undefined) updateData.timezone_offset = body.timezoneOffset;
    if (body.emailVerified !== undefined) updateData.email_verified = body.emailVerified;

    if (body.fullName !== undefined) {
      updateData.full_name = body.fullName;
      const parts = body.fullName.trim().split(/\s+/);
      updateData.display_name = parts[parts.length - 1] || body.fullName;
    }

    if (body.dateOfBirth !== undefined) {
      updateData.date_of_birth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }

    if (Object.keys(updateData).length > 0) {
      await userRepository.update(targetUserId, updateData, adminId);
    }

    if (body.roles !== undefined && Array.isArray(body.roles)) {
      let roleIds = [];
      if (body.roles.length > 0) {
        const foundRoles = await roleRepository.findByCodes(body.roles);
        if (foundRoles.length === 0) {
          throw AppError.badRequest("No valid roles found");
        }
        roleIds = foundRoles.map((r) => r.role_id);
      }
      await userRepository.assignRoles(targetUserId, roleIds, adminId);
    }

    const userWithRoles = await userRepository.findByIdWithRoles(targetUserId);
    return userDto.toProfileResponse(userWithRoles);
  },
  async getAllUsers(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { username: { contains: query.search, mode: "insensitive" } },
        { full_name: { contains: query.search, mode: "insensitive" } },
        { phone_number: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.isActive !== undefined && query.isActive !== "") {
      where.is_active = query.isActive === "true";
    }

    if (query.emailVerified !== undefined && query.emailVerified !== "") {
      where.email_verified = query.emailVerified === "true";
    }

    if (query.role) {
      where.mst_user_roles = {
        some: {
          is_active: true,
          mst_roles: { role_code: query.role },
          OR: [
            { expires_at_utc: null },
            { expires_at_utc: { gt: new Date() } },
          ],
        },
      };
    }

    const sortField = ALLOWED_SORT_FIELDS[query.sortBy] || "created_at_utc";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [sortField]: sortOrder };

    const { items, totalItems } = await userRepository.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(userDto.toAdminListItem),
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
