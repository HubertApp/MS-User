import { Resolver, Query, Mutation, Args, Directive } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UseGuards } from '@nestjs/common';
import { FederatedAuthGuard } from './guards/federated-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { User } from './entities/user.entity';
import { Span } from 'nestjs-otel';
import { GetUserResponse } from './dto/get-user.response';

@Resolver(() => GetUserResponse)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => GetUserResponse)
  @Span('getMe_resolver')
  @UseGuards(FederatedAuthGuard)
  async getMe(
    @CurrentUser() user: CreateUserInput,
  ): Promise<GetUserResponse | boolean> {
    const foundUser = await this.usersService.create(user);
    return foundUser;
  }

  @Query(() => GetUserResponse)
  @Span('getOne_resolver')
  @UseGuards(FederatedAuthGuard)
  async getOne(
    @CurrentUser() user: CreateUserInput,
  ): Promise<GetUserResponse | boolean> {
    const foundUser = await this.usersService.findOne(user.googleId);
    return foundUser;
  }

  @Directive('@inaccessible')
  @Span('createUser_resolver')
  @Mutation(() => GetUserResponse)
  async createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return await this.usersService.create(createUserInput);
  }

  @Query(() => [GetUserResponse])
  @Span('findAll_resolver')
  async findAll() {
    const users: User[] = await this.usersService.findAll();
    return users;
  }
  @Query(() => GetUserResponse)
  @UseGuards(FederatedAuthGuard)
  @Span('findOne_resolver')
  async findOne(@Args('googleId') googleId: string) {
    const user: User | boolean = await this.usersService.findOne(googleId);
    return user;
  }

  @Span('updateUser_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => String)
  async updateUser(
    @CurrentUser() user: CreateUserInput,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<string> {
    return this.usersService.update(user.googleId, updateUserInput);
  }

  @Span('removeUser_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => String)
  async removeUser(@Args('googleId') googleId: string): Promise<string> {
    const message: string = await this.usersService.remove(googleId);
    return message;
  }
}
