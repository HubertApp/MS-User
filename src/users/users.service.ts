import { Injectable, Inject } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './repository/users.repository';
import { User } from './entities/user.entity';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserInput: CreateUserInput) {
    const userExistent: User | string = await this.findOne(
      createUserInput.googleId,
    );

    if (typeof userExistent === 'string') {
      const newUser: User = await this.usersRepository.create(createUserInput);
      return newUser;
    }

    return userExistent;
  }

  async findAll() {
    return await this.usersRepository.findAll();
  }

  async findOne(googleId: string): Promise<User | string> {
    const user: User | null = await this.usersRepository.findById(googleId);

    if (user) {
      return user;
    }
    return 'Utilisateur non trouvé';
  }

  async update(
    googleId: string,
    updateUserInput: UpdateUserInput,
  ): Promise<string> {
    const updatedUser = await this.usersRepository.update(
      googleId,
      updateUserInput,
    );
    if (updatedUser) {
      return 'Utilisateur mis à jour avec succès';
    }
    return 'Utilisateur non trouvé';
  }

  async remove(googleId: string): Promise<string> {
    await this.usersRepository.delete(googleId);
    return 'Utilisateur supprimé avec succès';
  }
}
