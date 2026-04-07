import { Directive, Field, ID, Int, ObjectType } from '@nestjs/graphql';

@Directive('@key(fields: "googleId")')
@ObjectType()
export class User {
  @Field(() => ID)
  googleId: string;

  @Field({ nullable: true })
  email: string;

  @Field(() => Int)
  age: number;

  @Field({ nullable: true })
  pseudo: string;

  @Field({ nullable: true })
  role: string;
}
