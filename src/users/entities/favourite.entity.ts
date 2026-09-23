import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Favourite {
  @Field(() => String)
  userId?: string;

  @Field(() => String)
  title?: string;

  @Field(() => [Number])
  coordinatesDeparture?: [number, number];

  @Field(() => [Number])
  coordinatesArrival?: [number, number];
}