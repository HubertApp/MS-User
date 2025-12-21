export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(item: Partial<T>): Promise<T>;
  update(id: number, item: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}