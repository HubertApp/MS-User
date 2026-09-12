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

    return this.syncProfile(userExistent as User, createUserInput);
  }

  // Resynchronise pseudo/email/photo depuis Google à chaque login (appelé
  // par getMe et createUser). age/role restent gérés côté app et ne sont
  // jamais écrasés ici. Un champ absent de l'input (ex: photo via getMe,
  // qui ne la transmet pas) n'efface pas la valeur déjà en base.
  private async syncProfile(
    existing: User,
    input: CreateUserInput,
  ): Promise<User> {
    const patch: Partial<CreateUserInput> = {};
    if (input.pseudo) patch.pseudo = input.pseudo;
    if (input.email) patch.email = input.email;
    if (input.photo) patch.photo = input.photo;

    if (Object.keys(patch).length === 0) return existing;

    patch.updated_at = new Date();
    const updated = await this.usersRepository.update(
      existing.googleId,
      patch,
    );
    return updated ?? existing;
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

  async remove(googleId: string | undefined): Promise<string> {
    await this.usersRepository.delete(googleId);
    return 'Utilisateur supprimé avec succès';
  }

  // Liste blanche : évite qu'un canal mal orthographié désactive
  // silencieusement rien du tout, et documente les valeurs valides au même
  // endroit que les canaux réellement implémentés côté MS-notifications
  // (voir channels/ dans ce service).
  private static readonly VALID_CHANNELS = ['IN_APP', 'EMAIL'];

  async updateNotificationPreferences(
    googleId: string | undefined,
    disabledChannels: string[],
  ): Promise<User> {
    const deduped = [
      ...new Set(
        disabledChannels.filter((c) =>
          UsersService.VALID_CHANNELS.includes(c),
        ),
      ),
    ];

    const updated = await this.usersRepository.update(googleId, {
      notificationChannelsDisabled: deduped,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new Error('Utilisateur non trouvé');
    }

    return updated;
  }

  // MS-notifications (EventPattern 'user_created') ne déclenche l'envoi que
  // si data.user_id ET data.email sont présents — user_id est donc
  // obligatoire ici, pas juste un bonus.
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
