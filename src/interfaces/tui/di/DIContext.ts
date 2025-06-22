import { createContext } from 'react';

// Simple DI container interface
export interface DIContainer {
  get<T>(token: string): T | undefined;
  set<T>(token: string, instance: T): void;
}

// Basic implementation
export class SimpleDIContainer implements DIContainer {
  private services = new Map<string, any>();

  get<T>(token: string): T | undefined {
    return this.services.get(token);
  }

  set<T>(token: string, instance: T): void {
    this.services.set(token, instance);
  }
}

export const DIContext = createContext<DIContainer | null>(null);