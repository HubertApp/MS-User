import { CreateUserInput } from './create-user.input';
import { PartialType } from '@nestjs/mapped-types';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => Int, { nullable: true })
  age?: number;

  @Field(() => String, { nullable: true })
  pseudo?: string;

  @Field(() => String, { nullable: true })
  photo?: string;

  @Field(() => String, { nullable: true })
  role?: string;

  @Field(() => Date, { nullable: true })
  update_at?: Date;
}
