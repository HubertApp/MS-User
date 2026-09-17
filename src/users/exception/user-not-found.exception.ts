import { GraphQLError } from 'graphql';

export class UserNotFoundException extends GraphQLError {
  constructor(message: string = 'Utilisateur introuvable') {
    super(message, {
      extensions: {
        code: 'USER_NOT_FOUND',
        http: { status: 404 },
      },
    });

    this.name = 'UserNotFoundException';
  }
}
