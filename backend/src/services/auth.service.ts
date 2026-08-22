import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { prisma } from '../config/db';
import { UpdateProfileInput } from '../validators/auth.validator';
import { auditService } from './audit.service';
import { enforcePasswordPolicy } from '../utils/passwordPolicy.util';

function extractRolesAndPermissions(user: {
  userRoles: { role: { name: string; rolePermissions: { permission: { name: string } }[] } }[];
}) {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissionSet = new Set<string>();

  user.userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => permissionSet.add(rp.permission.name));
  });

  return { roles, permissions: Array.from(permissionSet) };
}

export const authService = {
  async login(username: string, password: string) {
    const user = await userRepository.findByUsername(username);

    if (!user || !user.isActive) {
      await auditService.record({ action: 'LOGIN_FAILED', entityType: 'User', description: `Login failed for username "${username}"` });
      throw new AppError('Invalid username or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await auditService.record({ userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, description: 'Incorrect password' });
      throw new AppError('Invalid username or password', 401);
    }

    const { roles, permissions } = extractRolesAndPermissions(user);
    await auditService.record({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, description: `User "${user.username}" logged in` });

    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      roles,
      permissions,
      tokenVersion: user.tokenVersion,
    });

    const refreshToken = signRefreshToken({ userId: user.id });

    await userRepository.setRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles,
        permissions,
      },
    };
  },

  async logout(userId: string) {
    await userRepository.setRefreshToken(userId, null);
    // Clearing the refresh token alone would leave the access token usable
    // for the rest of its lifetime; bumping the version ends it now.
    await userRepository.bumpTokenVersion(userId);
    await auditService.record({ userId, action: 'LOGOUT', entityType: 'User', entityId: userId, description: 'User logged out' });
  },

  async refresh(refreshToken: string) {
    let payload: { userId: string };

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    // A refresh token outlives an access token by days, so the account
    // behind it must be re-checked before a new one is minted.
    if (user.deletedAt !== null || !user.isActive) {
      throw new AppError('This account is no longer active', 401);
    }

    const { roles, permissions } = extractRolesAndPermissions(user);

    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      roles,
      permissions,
      tokenVersion: user.tokenVersion,
    });

    const newRefreshToken = signRefreshToken({ userId: user.id });
    await userRepository.setRefreshToken(user.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { roles, permissions } = extractRolesAndPermissions(user);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      profilePhoto: user.profilePhoto,
      roles,
      permissions,
    };
  },

  // --- Self-service profile actions (Administration > Profile page) ---

  async updateProfile(userId: string, input: UpdateProfileInput) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
      },
    });

    return authService.me(userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    await enforcePasswordPolicy(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Changing a password signs every other session out, so tokens issued
    // against the old password must stop working immediately.
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
  },

  async setProfilePhoto(userId: string, relativePath: string) {
    await prisma.user.update({ where: { id: userId }, data: { profilePhoto: relativePath } });
    return authService.me(userId);
  },
};
