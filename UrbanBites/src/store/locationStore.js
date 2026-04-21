import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set, get) => ({
      lat: 28.6139,
      lng: 77.2090,
      locationName: 'Detecting location…',
      isInitialized: false,

      setLocation: (lat, lng, name) =>
        set({ lat, lng, locationName: name, isInitialized: true }),

      /** Called once on app startup to detect GPS location */
      initFromGPS: async () => {
        if (get().isInitialized) return; // already have a saved location
        if (!navigator.geolocation) {
          set({ locationName: 'New Delhi', isInitialized: true });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=13`
              );
              const d = await res.json();
              const name =
                d?.address?.suburb ||
                d?.address?.neighbourhood ||
                d?.address?.city ||
                'Current Location';
              set({ lat, lng, locationName: name, isInitialized: true });
            } catch {
              set({ lat, lng, locationName: 'Current Location', isInitialized: true });
            }
          },
          () => set({ locationName: 'New Delhi', isInitialized: true })
        );
      },
    }),
    { name: 'ub-location-v1' }
  )
);
