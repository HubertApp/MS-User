import { Field, Int, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetUserResponse {
  @Field(() => ID)
  googleId?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => Int, { nullable: true })
  age?: number;

  @Field(() => String, { nullable: true })
  pseudo?: string;

  @Field(() => String, { nullable: true })
  role?: string;

  @Field(() => Date, { nullable: true })
  created_at?: Date;

  @Field(() => Date, { nullable: true })
  updated_at?: Date;
}
