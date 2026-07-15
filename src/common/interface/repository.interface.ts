export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(googleId: string): Promise<T | null>;
  create(item: Partial<T>): Promise<T>;
  update(googleId: string, item: Partial<T>): Promise<T | null>;
  delete(googleId: string): Promise<boolean>;
}
