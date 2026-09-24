import { Field, Float, InputType } from '@nestjs/graphql';
import { IsLatitude, IsLongitude, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class LocationInput {
  @Field(() => Float)
  @IsLatitude()
  latitude: number;

  @Field(() => Float)
  @IsLongitude()
  longitude: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  label: string;
}
