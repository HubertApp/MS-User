import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class LocationEntity {
  @Field(() => Float)
  latitude?: number;

  @Field(() => Float)
  longitude?: number;

  @Field()
  label?: string;
}
