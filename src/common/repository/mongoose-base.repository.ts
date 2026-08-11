import { Model, Document } from 'mongoose';
import { IRepository } from '../interface/repository.interface';

export abstract class MongooseBaseRepository<
  T extends Document,
> implements IRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findAll(): Promise<T[]> {
    return this.model.find().exec();
  }

  async findById(googleId: string | undefined): Promise<T | null> {
    return this.model.findOne({ googleId }).exec();
  }

  async create(item: Partial<T>): Promise<T> {
    const createdItem = await new this.model(item).save();
    return createdItem;
  }

  async update(
    googleId: string | undefined,
    item: Partial<T>,
  ): Promise<T | null> {
    // $set nécessaire, voir ARCHITECTURE.md §3.
    return this.model
      .findOneAndUpdate({ googleId }, { $set: item }, { new: true })
      .exec();
  }

  async delete(googleId: string | undefined): Promise<boolean> {
    const result = await this.model.findOneAndDelete({ googleId }).exec();
    return result !== null;
  }
}
