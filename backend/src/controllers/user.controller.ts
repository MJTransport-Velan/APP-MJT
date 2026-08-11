import { Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const userController = {
  list: asyncHandler(async (req, res: Response) => {
    const users = await userService.list();
    return sendSuccess(res, 200, { message: 'Users fetched', data: users });
  }),

  create: asyncHandler(async (req, res: Response) => {
    const user = await userService.create(req.body);
    return sendSuccess(res, 201, { message: 'User created', data: user });
  }),

  update: asyncHandler(async (req, res: Response) => {
    const user = await userService.update(req.params.id, req.body);
    return sendSuccess(res, 200, { message: 'User updated', data: user });
  }),

  remove: asyncHandler(async (req, res: Response) => {
    await userService.remove(req.params.id);
    return sendSuccess(res, 200, { message: 'User deleted' });
  }),
};
