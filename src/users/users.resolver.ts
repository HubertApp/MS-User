import { Resolver, Query, Mutation, Args, Directive } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Logger, UseGuards } from '@nestjs/common';
import { FederatedAuthGuard } from './guards/federated-auth.guard';
import { AdminGuard } from './guards/admin-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { User } from './entities/user.entity';
import { Span } from 'nestjs-otel';
import { GetUserResponse } from './dto/get-user.response';
import { UserNotFoundException } from './exception/user-not-found.exception';
import { FavouriteUserInput } from './dto/favourite-user.input';

@Resolver(() => GetUserResponse)
export class UsersResolver {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersService: UsersService) {}

  @Query(() => GetUserResponse)
  @Span('getMe_resolver')
  @UseGuards(FederatedAuthGuard)
  async getMe(
    @CurrentUser() user: CreateUserInput,
  ): Promise<GetUserResponse | boolean> {
    const foundUser = await this.usersService.create(user);
    this.logger.log(`User found or created`);
    return foundUser;
  }

  @Query(() => GetUserResponse)
  @Span('getOne_resolver')
  @Directive('@inaccessible')
  @UseGuards(FederatedAuthGuard)
  async getOne(@CurrentUser() user: CreateUserInput): Promise<GetUserResponse> {
    const foundUser = await this.usersService.findOne(user.googleId);

    if (!foundUser) {
      throw new UserNotFoundException();
    }

    return foundUser as GetUserResponse;
  }

  @Directive('@inaccessible')
  @Span('createUser_resolver')
  @Mutation(() => GetUserResponse)
  async createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return await this.usersService.create(createUserInput);
  }

  @Query(() => [GetUserResponse])
  @UseGuards(AdminGuard)
  @Span('findAll_resolver')
  async findAll() {
    const users: User[] = await this.usersService.findAll();
    return users;
  }

  @Query(() => GetUserResponse)
  @UseGuards(FederatedAuthGuard)
  @Span('findOne_resolver')
  async findOne(@Args('googleId') googleId: string): Promise<GetUserResponse> {
    const user: User | boolean = await this.usersService.findOne(googleId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return user as GetUserResponse;
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

  // Pas d'argument googleId : l'identité ciblée vient uniquement de
  // @CurrentUser(), sinon un utilisateur authentifié pourrait fournir le
  // googleId de quelqu'un d'autre et supprimer son compte à sa place (IDOR).
  @Span('removeUser_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => String)
  async removeUser(@CurrentUser() user: CreateUserInput): Promise<string> {
    const message: string = await this.usersService.remove(user.googleId);
    return message;
  }

  @Span('addFavourite_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => String)
  async addFavourite(
    @CurrentUser() user: CreateUserInput,
    @Args('favouriteId') favouriteId: FavouriteUserInput,
  ): Promise<string> {
    return this.usersService.addFavourite(user.googleId, favouriteId);
  }

  @Span('removeFavourite_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => String)
  async removeFavourite(
    @CurrentUser() user: CreateUserInput,
    @Args('title') title: string,
  ): Promise<string> {
    return this.usersService.removeFavourite(user.googleId, title);
  }

  // Même principe que removeUser/updateUser : googleId vient uniquement de
  // @CurrentUser(), jamais d'un argument client (IDOR).
  @Span('updateNotificationPreferences_resolver')
  @UseGuards(FederatedAuthGuard)
  @Mutation(() => GetUserResponse)
  async updateNotificationPreferences(
    @CurrentUser() user: CreateUserInput,
    @Args('disabledChannels', { type: () => [String] })
    disabledChannels: string[],
  ): Promise<GetUserResponse> {
    return this.usersService.updateNotificationPreferences(
      user.googleId,
      disabledChannels,
    );
  }
}
