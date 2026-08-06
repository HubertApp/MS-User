// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseBaseRepository } from '../../common/repository/mongoose-base.repository';
import { UserMongooseSchema, UserDocument } from '../schema/user.schema';

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
}
