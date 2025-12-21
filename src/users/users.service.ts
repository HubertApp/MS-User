import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './repository/users.repository';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  // private users: User[] = [];

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserInput: CreateUserInput) {
    await this.usersRepository.create(createUserInput);
    return createUserInput;
  }

  async findAll() {
    return await this.usersRepository.findAll();
  }

  async findOne(id: number): Promise<User | string> {
    const user:User | null = await this.usersRepository.findById(id);
  
    if (user) {
      return user;
    }
    return 'Utilisateur non trouvé';
  }

  async update(id: number, updateUserInput: UpdateUserInput): Promise<string> {
    const updatedUser = await this.usersRepository.update(id, updateUserInput);
    if (updatedUser) {
      return "Utilisateur mis à jour avec succès";
    }
    return 'Utilisateur non trouvé';
  }

  async remove(id: number): Promise<string> {
    await this.usersRepository.delete(id);
    return "Utilisateur supprimé avec succès";
  }
}
