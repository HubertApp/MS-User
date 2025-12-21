import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMongooseSchema, UserSchema } from './schema/user.schema';
import { UsersRepository } from './repository/users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserMongooseSchema.name, schema: UserSchema }])
  ],
  providers: [UsersResolver, UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
