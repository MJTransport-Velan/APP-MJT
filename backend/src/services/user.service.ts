import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middlewares/error.middleware';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator';

function serializeUser(user: {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userRoles: { role: { id: string; name: string } }[];
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    roles: user.userRoles.map((ur) => ur.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const userService = {
  async list() {
    const users = await userRepository.findAll();
    return users.map(serializeUser);
  },

  async create(input: CreateUserInput) {
    const existing = await userRepository.findByUsername(input.username);

    if (existing) {
      throw new AppError('Username already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await userRepository.create({
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      password: hashedPassword,
    });

    if (input.roleIds && input.roleIds.length > 0) {
      await userRepository.setRoles(user.id, input.roleIds);
    }

    const fullUser = await userRepository.findById(user.id);
    return serializeUser(fullUser!);
  },

  async update(id: string, input: UpdateUserInput) {
    const existing = await userRepository.findById(id);

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await userRepository.update(id, {
      email: input.email,
      fullName: input.fullName,
      isActive: input.isActive,
    });

    if (input.roleIds) {
      await userRepository.setRoles(id, input.roleIds);
    }

    const updated = await userRepository.findById(id);
    return serializeUser(updated!);
  },

  async remove(id: string) {
    const existing = await userRepository.findById(id);

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await userRepository.delete(id);
  },
};
