import { Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './repository/users.repository';
import { User } from './entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject('NOTIF_SERVICE') private readonly notifClient: ClientProxy,
  ) {}

  async create(createUserInput: CreateUserInput) {
    const userExistent: User | boolean = await this.findOne(
      createUserInput.googleId,
    );

    if (userExistent === false) {
      createUserInput.created_at = new Date();
      createUserInput.updated_at = new Date();

      const newUser: User = await this.usersRepository.create(createUserInput);

      this.sendNotification(newUser);
      return newUser;
    }

    return userExistent;
  }

  async findAll() {
    return await this.usersRepository.findAll();
  }

  async findOne(googleId: string | undefined): Promise<User | boolean> {
    const user: User | null = await this.usersRepository.findById(googleId);

    if (user) {
      return user;
    }

    return false;
    // throw new NotFoundException(`Utilisateur avec l'ID Google ${googleId} introuvable.`);
  }

  async update(
    googleId: string | undefined,
    updateUserInput: UpdateUserInput,
  ): Promise<string> {
    updateUserInput.updated_at = new Date();
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

  private sendNotification(user: any) {
    const payload = {
      email: user.email,
      pseudo: user.pseudo,
      subject: 'Bienvenue sur Hubert App !',
      template: 'welcome',
    };

    this.notifClient.emit('user_created', payload);
  }
}
