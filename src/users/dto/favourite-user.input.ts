import { Field, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationInput } from './location.input';

@InputType()
export class FavouriteUserInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @Field(() => LocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationInput)
  departure?: LocationInput;

  @Field(() => LocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationInput)
  arrival?: LocationInput;

  @Field(() => Date, {
    nullable: true,
    description: 'Ignoré, renseigné par le serveur',
  })
  @IsOptional()
  @IsDate()
  created_at?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Ignoré, renseigné par le serveur',
  })
  @IsOptional()
  @IsDate()
  updated_at?: Date;
}
