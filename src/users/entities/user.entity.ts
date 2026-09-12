import { Directive, Field, ID, Int, ObjectType } from '@nestjs/graphql';

@Directive('@key(fields: "googleId")')
@ObjectType()
export class User {
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

  // Canaux de notification que l'utilisateur a désactivés (ex: "EMAIL",
  // "IN_APP"). Jamais synchronisé depuis Google, voir syncProfile() dans
  // users.service.ts -- géré uniquement via updateNotificationPreferences.
  @Field(() => [String], { nullable: true })
  notificationChannelsDisabled?: string[];

  @Field(() => Date, { nullable: true })
  created_at?: Date;

  @Field(() => Date, { nullable: true })
  updated_at?: Date;
}
