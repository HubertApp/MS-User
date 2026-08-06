import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMongooseSchema, UserSchema } from './schema/user.schema';
import { UsersRepository } from './repository/users.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIF_SERVICE',
        transport: Transport.RMQ,
        options: {
          // "rabbitmq" = nom du Service k8s (voir k8s/00-rabbitmq-notifications.yaml),
          // celui que MS-notifications utilise déjà pour consommer cette
          // même queue. RABBITMQ_URL n'est pas défini dans le manifeste de
          // MS-User pour l'instant, donc c'est ce fallback qui sera utilisé.
          urls: [process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'],
          queue: 'notifications_queue',
          noAssert: true,
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: UserMongooseSchema.name, schema: UserSchema },
    ]),
  ],
  providers: [UsersResolver, UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
