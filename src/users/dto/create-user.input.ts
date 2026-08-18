import { InputType, Field, Int, ID } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field(() => ID)
  googleId?: string;

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

  @Field(() => Date, { nullable: true, defaultValue: new Date() })
  created_at?: Date;

  @Field(() => Date, { nullable: true, defaultValue: new Date() })
  updated_at?: Date;
}
