import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsDate, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field(() => ID)
  @IsString()
  @MaxLength(64)
  googleId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pseudo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  photo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['USER'])
  role?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  created_at?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  updated_at?: Date;
}
