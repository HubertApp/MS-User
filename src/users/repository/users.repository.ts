import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseBaseRepository } from '../../common/repository/mongoose-base.repository';
import { UserMongooseSchema, UserDocument } from '../schema/user.schema';
import { FavouriteUserInput } from '../dto/favourite-user.input';

export type UpsertFavouriteResult = 'added' | 'updated' | null;

@Injectable()
export class UsersRepository extends MongooseBaseRepository<UserDocument> {
  constructor(
    @InjectModel(UserMongooseSchema.name) userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email }).exec();
  }

  async upsertFavourite(
    googleId: string,
    favourite: FavouriteUserInput,
  ): Promise<UpsertFavouriteResult> {
    const now = new Date();
    const departure = favourite.departure ?? null;
    const arrival = favourite.arrival ?? null;

    const updateExisting = () =>
      this.model
        .updateOne(
          { googleId, 'favourites.title': favourite.title },
          {
            $set: {
              'favourites.$.departure': departure,
              'favourites.$.arrival': arrival,
              'favourites.$.updated_at': now,
              updated_at: now,
            },
          },
        )
        .exec();

    if ((await updateExisting()).matchedCount > 0) return 'updated';

    const pushed = await this.model
      .updateOne(
        { googleId, 'favourites.title': { $ne: favourite.title } },
        {
          $push: {
            favourites: {
              title: favourite.title,
              departure,
              arrival,
              created_at: now,
              updated_at: now,
            },
          },
          $set: { updated_at: now },
        },
      )
      .exec();

    if (pushed.matchedCount > 0) return 'added';

    if ((await updateExisting()).matchedCount > 0) return 'updated';

    return null;
  }

  async removeFavourite(
    googleId: string,
    title: string,
  ): Promise<boolean | null> {
    const result = await this.model
      .updateOne(
        { googleId, 'favourites.title': title },
        { $pull: { favourites: { title } }, $set: { updated_at: new Date() } },
      )
      .exec();

    if (result.matchedCount > 0) return true;

    const userExists = await this.model.exists({ googleId }).exec();
    return userExists ? false : null;
  }
}
