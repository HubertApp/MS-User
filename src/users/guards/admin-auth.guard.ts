import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { FederatedAuthGuard } from './federated-auth.guard';
import { ForbiddenException } from '../exception/forbidden.exception';

@Injectable()
export class AdminGuard extends FederatedAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    super.canActivate(context); // valide le token + peuple ctx.req.user

    const ctx = GqlExecutionContext.create(context).getContext();

    if (ctx.req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Droits insuffisants');
    }

    return true;
  }
}
