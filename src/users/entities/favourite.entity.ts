import { Field, ObjectType } from '@nestjs/graphql';
import { LocationEntity } from './location.entity';

@ObjectType()
export class Favourite {
  @Field(() => String)
  title?: string;

  @Field(() => LocationEntity, { nullable: true })
  departure?: LocationEntity | null;

  @Field(() => LocationEntity, { nullable: true })
  arrival?: LocationEntity | null;

  @Field(() => Date, { nullable: true })
  created_at?: Date;

  @Field(() => Date, { nullable: true })
  updated_at?: Date;
}
