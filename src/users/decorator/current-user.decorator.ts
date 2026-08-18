import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

export const extractUserFromHeaders = (headers: any): User => {
  const userId = headers['x-user-id'];

  if (!userId) {
    throw new Error('Id user non trouvé dans le header');
  }

  return {
    googleId: userId,
    role: headers['x-user-role'],
    email: headers['x-user-email'],
    pseudo: headers['x-user-pseudo'],
    age: headers['x-user-age'],
  };
};

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return extractUserFromHeaders(ctx.getContext().req.headers);
  },
);
