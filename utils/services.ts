export interface ClientServiceContract {
  name: string;
  price: number;
  active?: boolean;
  start_date?: string;
}

export const servicesUtils = {
  /**
   * Parses the services array from the database.
   * Handles both JSON stringified records and legacy raw string names.
   */
  parseClientServices(services: string[] | undefined, servicesCatalog: any[] = []): ClientServiceContract[] {
    if (!services || !Array.isArray(services)) return [];
    
    return services.map(srv => {
      // Clean string
      if (!srv) return null;
      const trimmed = srv.trim();
      
      // Check if it is a JSON string
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            return {
              name: parsed.name,
              price: Number(parsed.price) || 0,
              active: parsed.active !== undefined ? parsed.active : true,
              start_date: parsed.start_date || undefined
            };
          }
        } catch (e) {
          // Fall through to plain text parsing
        }
      }
      
      // Fallback: Legacy plain text service name
      const matched = servicesCatalog.find(s => s.name?.toLowerCase() === trimmed.toLowerCase());
      return {
        name: trimmed,
        price: matched ? (Number(matched.default_price) || 0) : 0,
        active: true
      };
    }).filter(Boolean) as ClientServiceContract[];
  },

  /**
   * Serializes service contracts to saving format in the database.
   */
  serializeClientServices(contracts: ClientServiceContract[]): string[] {
    if (!contracts || !Array.isArray(contracts)) return [];
    return contracts.map(c => JSON.stringify({
      name: c.name,
      price: Number(c.price) || 0,
      active: c.active !== undefined ? c.active : true,
      start_date: c.start_date || undefined
    }));
  }
};
