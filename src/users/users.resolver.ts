import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation('createUser')
  create(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Query('users')
  async findAll() {
    const users: User[] = await this.usersService.findAll();
    return users;
  }

  @Query('user')
  async findOne(@Args('id') id: number) {
    const user: User | string = await this.usersService.findOne(id);
    return user;
  }

  @Mutation('updateUser')
  async update(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    const message: string = await this.usersService.update(
      updateUserInput.id,
      updateUserInput,
    );
    return message;
  }

  @Mutation('removeUser')
  async remove(@Args('id') id: number) : Promise<string> {
    const message: string = await this.usersService.remove(id);
    return message;
  }
}
