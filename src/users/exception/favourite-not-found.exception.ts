import { GraphQLError } from 'graphql';

export class FavouriteNotFoundException extends GraphQLError {
  constructor(message: string = 'Favori introuvable') {
    super(message, {
      extensions: {
        code: 'FAVOURITE_NOT_FOUND',
        http: { status: 404 },
      },
    });

    this.name = 'FavouriteNotFoundException';
  }
}
