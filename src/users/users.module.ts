import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMongooseSchema, UserSchema } from './schema/user.schema';
import { UsersRepository } from './repository/users.repository';
// import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    // ClientsModule.register([
    //   {
    //     name: 'NOTIF_SERVICE',
    //     transport: Transport.RMQ,
    //     options: {
    //       urls: ['amqp://user:password@message-broker:5672'],
    //       queue: 'notifications_queue',
    //       noAssert: true,
    //       queueOptions: {
    //         durable: false,
    //       },
    //     },
    //   },
    // ]),
    MongooseModule.forFeature([
      { name: UserMongooseSchema.name, schema: UserSchema },
    ]),
  ],
  providers: [UsersResolver, UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
