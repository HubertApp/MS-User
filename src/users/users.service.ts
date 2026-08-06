import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './repository/users.repository';
import { User } from './entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  // MS-notifications (EventPattern 'user_created') ne déclenche l'envoi que
  // si data.user_id ET data.email sont présents — voir
  // ms-notifications.controller.ts. user_id est donc obligatoire ici, pas
  // juste un bonus.
  private sendNotification(user: any) {
    if (!user.googleId || !user.email) return;

    const payload = {
      user_id: user.googleId,
      email: user.email,
      pseudo: user.pseudo,
      subject: 'Bienvenue sur Hubert App !',
      template: 'welcome',
    };

    // emit() renvoie un Observable froid : sans subscribe(), rien n'est
    // publié du tout (piège classique NestJS/RxJS). Fire-and-forget : une
    // erreur de publication ne doit jamais faire échouer la création du
    // compte, déjà persisté à ce stade.
    try {
      this.notifClient.emit('user_created', payload).subscribe({
        error: (err) =>
          this.logger.warn(
            `Échec de publication de user_created pour ${user.googleId} : ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
      });
    } catch (err) {
      this.logger.warn(
        `Échec de publication de user_created pour ${user.googleId} : ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
