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
  findAll() {
    const users: User[] = this.usersService.findAll();
    return users;
  }

  @Query('user')
  findOne(@Args('id') id: number) {
    const user: User | string = this.usersService.findOne(id);
    return user;
  }

  @Mutation('updateUser')
  update(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    const message: string = this.usersService.update(
      updateUserInput.id,
      updateUserInput,
    );
    return message;
  }

  @Mutation('removeUser')
  remove(@Args('id') id: number) {
    const message: string = this.usersService.remove(id);
    return message;
  }
}
