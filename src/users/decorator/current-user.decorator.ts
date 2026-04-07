import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../entities/user.entity';
// import { CreateAuthInput } from '../dto/create-auth.input';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];
    const email = request.headers['x-user-email'];
    const pseudo = request.headers['x-user-pseudo'];
    const age = request.headers['x-user-age'];

    if (!userId) {
      throw new Error('User ID not found in request headers');
    }

    const user: User = {
      googleId: userId,
      email: email,
      pseudo: pseudo,
      age: age,
      role: role,
    };

    return user;
  },
);
