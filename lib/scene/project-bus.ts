// The project list and the monitor live in different components; this tiny store connects them.
type Listener = (index: number) => void;

let current = 0;
const listeners = new Set<Listener>();

export const projectBus = {
  get: () => current,
  set(index: number) {
    if (index === current) return;
    current = index;
    listeners.forEach((l) => l(index));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
