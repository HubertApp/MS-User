import { Model, Document, HydratedDocument } from 'mongoose';
import { IRepository } from '../interface/repository.interface';

export abstract class MongooseBaseRepository<T extends Document> implements IRepository<T> {
  constructor(protected readonly model: Model<T>) {}


  async findAll(): Promise<T[]> {
    return this.model.find().exec();
  }

  async findById(id: number): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async create(item: any): Promise<T> {
    const createdItem = new this.model(item);
    return createdItem.save() as any;
  }

  async update(id: number, item: Partial<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, item, { new: true }).exec();
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }
}