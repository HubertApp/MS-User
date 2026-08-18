import { GraphQLError } from 'graphql';

export class UnauthorizedException extends GraphQLError {
  constructor(message: string = 'Unauthorized') {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });

    this.name = 'UnauthorizedException';
  }
}
