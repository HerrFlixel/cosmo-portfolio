/** Führt Aufgaben mit höchstens `limit` gleichzeitig aus – über alle Aufrufe hinweg, in Aufrufreihenfolge. */
export function createTaskQueue(limit: number) {
  let running = 0;
  const waiting: (() => void)[] = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}
