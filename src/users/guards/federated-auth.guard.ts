import { GqlExecutionContext } from '@nestjs/graphql';
import { UnauthorizedException } from '../exception/unauthorized.exception';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class FederatedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context).getContext();
    const userId = ctx.req.headers['x-user-id'];
    const userRole = ctx.req.headers['x-user-role'];
    const userEmail = ctx.req.headers['x-user-email'];
    const userPseudo = ctx.req.headers['x-user-pseudo'];
    const userAge = ctx.req.headers['x-user-age'];
    const authState = ctx.req.headers['x-auth-state'];

    if (authState !== 'VALID') {
      throw new UnauthorizedException('Token invalide');
    }

    if (!userId) {
      throw new UnauthorizedException('Connexion requise !');
    }

    ctx.req.user = {
      id: userId,
      role: userRole,
      email: userEmail,
      pseudo: userPseudo,
      age: userAge,
    };
    return true;
  }
}
