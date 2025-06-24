export class DIContainer {
    private services = new Map<symbol, any>();
    
    register<T>(token: symbol & { __type: T }, instance: T): void {
        this.services.set(token, instance);
    }
    
    resolve<T>(token: symbol & { __type: T }): T {
        const service = this.services.get(token);
        if (!service) {
            throw new Error(`Service not found for token: ${token.toString()}`);
        }
        return service;
    }
    
    has(token: symbol): boolean {
        return this.services.has(token);
    }
    
    clear(): void {
        this.services.clear();
    }
}