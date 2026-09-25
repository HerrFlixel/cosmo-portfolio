import { describe, expect, it } from "vitest";
import { createTaskQueue } from "@/lib/task-queue";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("createTaskQueue", () => {
  it("never runs more than the limit at once, even across several batches", async () => {
    const run = createTaskQueue(3);
    let active = 0;
    let peak = 0;
    const task = (id: number) => async () => {
      active++;
      peak = Math.max(peak, active);
      await tick();
      active--;
      return id;
    };
    const first = [1, 2, 3, 4, 5].map((id) => run(task(id)));
    const second = [6, 7, 8, 9, 10].map((id) => run(task(id))); // zweiter Drop während der erste läuft
    expect(await Promise.all([...first, ...second])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(peak).toBe(3);
  });

  it("keeps going after a failing task", async () => {
    const run = createTaskQueue(1);
    await expect(run(async () => { throw new Error("kaputt"); })).rejects.toThrow("kaputt");
    await expect(run(async () => "weiter")).resolves.toBe("weiter");
  });
});
