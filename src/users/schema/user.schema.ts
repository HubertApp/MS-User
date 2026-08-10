import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserMongooseSchema>;

@Schema()
export class UserMongooseSchema {
  @Prop({ type: String, required: true, unique: true })
  googleId?: string;

  @Prop({ type: String, nullable: true, unique: true })
  email?: string;

  @Prop({ type: Number, nullable: true })
  age?: number;

  @Prop({ type: String, nullable: true })
  pseudo?: string;

  @Prop({ type: String, nullable: true })
  photo?: string;

  @Prop({ type: String, nullable: true })
  role?: string;

  @Prop({ type: Date, nullable: true })
  created_at?: Date;

  @Prop({ type: Date, nullable: true })
  updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserMongooseSchema);
