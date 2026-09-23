import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

const noopRes = { header: () => noopRes, setHeader: () => noopRes };

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context).getContext();
    return { req: ctx.req, res: ctx.res ?? noopRes };
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (req.headers?.['x-user-id'] as string) || req.ip;
  }
}
