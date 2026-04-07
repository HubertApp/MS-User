import { InputType, Field, Int, ID } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field(() => ID)
  googleId: string;
  @Field()
  email: string;
  @Field(() => Int)
  age: number;
  @Field()
  pseudo: string;
  @Field()
  role: string;
}
