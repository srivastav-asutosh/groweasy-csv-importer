import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver, but @tanstack/react-virtual needs one
// to be present (it takes an initial synchronous measurement before ever
// relying on the observer callback).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
