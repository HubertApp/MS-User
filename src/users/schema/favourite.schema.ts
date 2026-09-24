import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LocationMongoose {
  @Prop({ type: Number, required: true })
  latitude!: number;

  @Prop({ type: Number, required: true })
  longitude!: number;

  @Prop({ type: String, required: true })
  label!: string;
}

export const LocationSchema = SchemaFactory.createForClass(LocationMongoose);

@Schema({ _id: false })
export class FavouriteMongoose {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: LocationSchema, default: null })
  departure?: LocationMongoose | null;

  @Prop({ type: LocationSchema, default: null })
  arrival?: LocationMongoose | null;

  @Prop({ type: Date })
  created_at?: Date;

  @Prop({ type: Date })
  updated_at?: Date;
}

export const FavouriteSchema = SchemaFactory.createForClass(FavouriteMongoose);
