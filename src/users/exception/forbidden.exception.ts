import { GraphQLError } from 'graphql';


export class ForbiddenException extends GraphQLError {
  constructor(message: string = 'Droits insuffisants') {
    super(message, {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });

    this.name = 'ForbiddenException';
  }
}
