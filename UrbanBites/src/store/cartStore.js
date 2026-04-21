import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],          // local optimistic state
      restaurantId: null,
      restaurantName: null,
      isDrawerOpen: false,

      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      /**
       * Hydrate from a CartResponse (backend shape):
       * { cartId, restaurantId, restaurantName, totalItems, subtotal, items: CartItemResponse[] }
       */
      hydrateFromServer: (cartResponse) => {
        if (!cartResponse) return;
        set({
          restaurantId: cartResponse.restaurantId ?? null,
          restaurantName: cartResponse.restaurantName ?? null,
          items: (cartResponse.items ?? []).map((i) => ({
            id: i.menuItemId,          // use menuItemId as client-side key
            cartItemId: i.id,          // server-side cart item ID for PUT/DELETE
            name: i.menuItemName,
            price: Number(i.unitPrice),
            quantity: i.quantity,
            notes: i.notes,
            lineTotal: Number(i.lineTotal),
          })),
        });
      },

      /** Optimistic add — called before the API response arrives */
      addItem: (item, resId, resName) =>
        set((state) => {
          // Cross-restaurant guard
          if (
            state.restaurantId &&
            state.restaurantId !== resId &&
            state.items.length > 0
          ) {
            if (
              !window.confirm(
                `Your cart has items from "${state.restaurantName}". Clear cart and add from new restaurant?`
              )
            )
              return state;
            // Clear and add fresh
            return {
              items: [{ ...item, quantity: 1 }],
              restaurantId: resId,
              restaurantName: resName ?? null,
            };
          }

          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
              restaurantId: resId,
              restaurantName: resName ?? state.restaurantName,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
            restaurantId: resId,
            restaurantName: resName ?? null,
          };
        }),

      removeItem: (itemId) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === itemId);
          if (!existing) return state;
          if (existing.quantity > 1) {
            return {
              items: state.items.map((i) =>
                i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
              ),
            };
          }
          const newItems = state.items.filter((i) => i.id !== itemId);
          return {
            items: newItems,
            restaurantId: newItems.length === 0 ? null : state.restaurantId,
            restaurantName: newItems.length === 0 ? null : state.restaurantName,
          };
        }),

      clearCart: () =>
        set({ items: [], restaurantId: null, restaurantName: null }),

      // Derived helpers
      getTotalPrice: () =>
        get().items.reduce((t, i) => t + i.price * i.quantity, 0),
      getTotalItems: () =>
        get().items.reduce((t, i) => t + i.quantity, 0),
    }),
    { name: 'ub-cart-v2' }
  )
);
