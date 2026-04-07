import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserMongooseSchema>;

@Schema()
export class UserMongooseSchema {
  @Prop()
  googleId: string;

  @Prop()
  pseudo: string;

  @Prop()
  age: number;

  @Prop()
  email: string;

  @Prop()
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(UserMongooseSchema);
