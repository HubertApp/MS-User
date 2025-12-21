
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserMongooseSchema>;

@Schema()
export class UserMongooseSchema {

    @Prop()
    id: number;

    @Prop()
    username: string;

    @Prop()
    age: number;

    @Prop()
    email: string;

    @Prop()
    handicape: boolean;

}

export const UserSchema = SchemaFactory.createForClass(UserMongooseSchema);
