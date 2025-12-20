import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [];

  create(createUserInput: CreateUserInput) {
    this.users.push(createUserInput);
    return createUserInput;
  }

  findAll() {
    return this.users;
  }

  findOne(id: number): User | string {
    const user: User | undefined = this.users.find((user) => user.id === id);
    if (user) {
      return user;
    }
    return 'Utilisateur non trouvé';
  }

  update(id: number, updateUserInput: UpdateUserInput): string {
    return `This action updates a #${id} user #${updateUserInput.email}`;
  }

  remove(id: number): string {
    return `This action removes a #${id} user`;
  }
}
