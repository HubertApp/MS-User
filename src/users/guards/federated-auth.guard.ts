import { GqlExecutionContext } from '@nestjs/graphql';
import { UnauthorizedException } from '../exception/unauthorized.exception';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class FederatedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context).getContext();
    const headers = ctx.req.headers;

    const authState = headers['x-auth-state'];
    const userId = headers['x-user-id'];

    if (authState && authState !== 'VALID') {
      throw new UnauthorizedException('Token invalide');
    }

    if (!userId) {
      throw new UnauthorizedException('Connexion requise !');
    }

    ctx.req.user = {
      googleId: String(userId),
      email: headers['x-user-email']
        ? String(headers['x-user-email'])
        : undefined,
      pseudo: headers['x-user-pseudo']
        ? String(headers['x-user-pseudo'])
        : undefined,
      role: headers['x-user-role'] ? String(headers['x-user-role']) : 'USER',
      age: headers['x-user-age'] ? Number(headers['x-user-age']) : 0,
    };

    return true;
  }
}
