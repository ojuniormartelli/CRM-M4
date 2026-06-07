export interface ClientServiceContract {
  name: string;
  price: number; // Effective price for all existing systems
  active?: boolean;
  start_date?: string;
  billing_type?: 'recorrente' | 'parcelado';
  installments?: number;
  installment_value?: number;
  include_in_monthly?: boolean;
  remaining_installments?: number;
  paid_installments?: number;
  base_price?: number;
  custom_price?: number;
  use_custom_price?: boolean;
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
      
      const matched = servicesCatalog.find(s => s.name?.toLowerCase() === trimmed.toLowerCase());
      const defaultCatalogPrice = matched ? (Number(matched.default_price) || 0) : 0;

      // Check if it is a JSON string
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            const matched_in_loop = servicesCatalog.find(s => s.name?.toLowerCase() === parsed.name.toLowerCase());
            const loopCatalogPrice = matched_in_loop ? (Number(matched_in_loop.default_price) || 0) : 0;
            
            const bPrice = parsed.base_price !== undefined ? Number(parsed.base_price) : (parsed.price !== undefined && parsed.custom_price === undefined ? Number(parsed.price) : loopCatalogPrice);
            const cPrice = parsed.custom_price !== undefined ? Number(parsed.custom_price) : undefined;
            const useCustom = parsed.use_custom_price !== undefined ? !!parsed.use_custom_price : (cPrice !== undefined);
            
            const effectivePrice = useCustom && cPrice !== undefined ? cPrice : (parsed.price !== undefined ? Number(parsed.price) : bPrice);

            return {
              name: parsed.name,
              price: effectivePrice,
              active: parsed.active !== undefined ? parsed.active : true,
              start_date: parsed.start_date || undefined,
              billing_type: parsed.billing_type || 'recorrente',
              installments: parsed.installments || 1,
              installment_value: parsed.installment_value || 0,
              include_in_monthly: parsed.include_in_monthly !== undefined ? parsed.include_in_monthly : true,
              remaining_installments: parsed.remaining_installments,
              paid_installments: parsed.paid_installments || 0,
              base_price: bPrice,
              custom_price: cPrice,
              use_custom_price: useCustom
            };
          }
        } catch (e) {
          // Fall through to plain text parsing
        }
      }
      
      // Fallback: Legacy plain text service name
      return {
        name: trimmed,
        price: defaultCatalogPrice,
        active: true,
        billing_type: 'recorrente',
        installments: 1,
        installment_value: 0,
        include_in_monthly: true,
        remaining_installments: undefined,
        paid_installments: 0,
        base_price: defaultCatalogPrice,
        custom_price: undefined,
        use_custom_price: false
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
      start_date: c.start_date || undefined,
      billing_type: c.billing_type || 'recorrente',
      installments: c.installments || 1,
      installment_value: c.installment_value || 0,
      include_in_monthly: c.include_in_monthly !== undefined ? c.include_in_monthly : true,
      remaining_installments: c.remaining_installments !== undefined ? c.remaining_installments : (c.billing_type === 'parcelado' ? c.installments : undefined),
      paid_installments: c.paid_installments || 0,
      base_price: c.base_price !== undefined ? Number(c.base_price) : undefined,
      custom_price: c.custom_price !== undefined ? Number(c.custom_price) : undefined,
      use_custom_price: c.use_custom_price !== undefined ? !!c.use_custom_price : false
    }));
  }
};
