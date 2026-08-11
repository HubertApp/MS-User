import { readFileSync } from 'fs';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMongooseSchema, UserSchema } from './schema/user.schema';
import { UsersRepository } from './repository/users.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';

// Détail de la connexion RabbitMQ/TLS : voir ARCHITECTURE.md §1.
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqps://user:password@rabbitmq:5671';
const RABBITMQ_CA_PATH = process.env.RABBITMQ_CA_PATH || '/etc/rabbitmq-tls/ca.pem';
const socketOptions = RABBITMQ_URL.startsWith('amqps://')
  ? { ca: [readFileSync(RABBITMQ_CA_PATH)] }
  : undefined;

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIF_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [RABBITMQ_URL],
          queue: 'notifications_queue',
          socketOptions,
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
