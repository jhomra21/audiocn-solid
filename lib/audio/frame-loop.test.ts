import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  createFrameTask,
  createPainterClock,
  MAX_FRAME_GAP_MS,
  subscribeFrame,
} from "./frame-loop";

const FRAME_MS = 16;

let nextId = 1;

let nowMs = 0;

let frames = new Map<number, FrameRequestCallback>();

const frameGlobals = ["requestAnimationFrame", "cancelAnimationFrame"] as const;

const originalDescriptors = new Map(
  frameGlobals.map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ])
);

/** Puts each global back as found: absent stays absent, others keep their descriptor. */
const restoreFrameGlobals = () => {
  for (const name of frameGlobals) {
    const descriptor = originalDescriptors.get(name);

    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
};

const useFakeFrames = () => {
  nowMs = 0;
  nextId = 1;
  frames = new Map();
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId++;
    frames.set(id, callback);

    return id;
  };

  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
};

const advance = (duration: number) => {
  const endMs = nowMs + duration;

  while (frames.size > 0) {
    nowMs += FRAME_MS;

    if (nowMs > endMs) {
      nowMs = endMs;
      break;
    }

    const scheduled = [...frames.values()];
    frames.clear();

    for (const callback of scheduled) callback(nowMs);
  }
};

const timerCount = () => frames.size;

describe("createFrameTask", () => {
  beforeEach(() => {
    useFakeFrames();
  });

  afterEach(() => {
    restoreFrameGlobals();
  });

  it("runs while the step needs frames, then requests none", () => {
    let remaining = 3;

    const step = mock(() => {
      remaining -= 1;

      return remaining > 0;
    });

    const task = createFrameTask(step);

    advance(FRAME_MS * 10);
    expect(step).toHaveBeenCalledTimes(3);
    expect(timerCount()).toBe(0);
    task.stop();
  });

  it("wakes a sleeping task, and ignores a wake while it runs", () => {
    const step = mock(() => false);
    const task = createFrameTask(step);
    advance(FRAME_MS * 4);
    expect(step).toHaveBeenCalledTimes(1);

    task.wake();
    task.wake();
    advance(FRAME_MS * 4);
    expect(step).toHaveBeenCalledTimes(2);
    expect(timerCount()).toBe(0);
    task.stop();
  });

  it("does not queue a duplicate frame when a task wakes during a tick", () => {
    const step = mock(() => false);
    const task = createFrameTask(step);
    const unsubscribe = subscribeFrame(() => task.wake());

    try {
      advance(FRAME_MS);

      expect(step).toHaveBeenCalledTimes(2);
      expect(timerCount()).toBe(1);
    } finally {
      unsubscribe();
      task.stop();
    }
  });

  it("never runs again once stopped", () => {
    const step = mock(() => true);
    const task = createFrameTask(step);
    advance(FRAME_MS * 2);
    const calls = step.mock.calls.length;

    task.stop();
    task.wake();
    advance(FRAME_MS * 4);
    expect(step).toHaveBeenCalledTimes(calls);
    expect(timerCount()).toBe(0);
  });

  it("keeps the shared loop alive only for tasks that are awake", () => {
    const sleeper = createFrameTask(() => false);
    const runner = mock(() => true);
    const awake = createFrameTask(runner);
    advance(FRAME_MS * 3);
    expect(timerCount()).toBe(1);

    awake.stop();
    advance(FRAME_MS * 2);
    expect(timerCount()).toBe(0);
    sleeper.stop();
  });
});

describe("createPainterClock", () => {
  it("follows the frames", () => {
    const clock = createPainterClock();
    expect(clock(1000)).toBe(0);
    expect(clock(1016)).toBe(16);
    expect(clock(1032)).toBe(32);
  });

  it("never jumps more than the frame gap, after a sleep or a hidden tab", () => {
    const clock = createPainterClock();
    clock(0);
    clock(16);
    expect(clock(60_000)).toBe(16 + MAX_FRAME_GAP_MS);
  });

  it("never runs backwards", () => {
    const clock = createPainterClock();
    clock(500);
    expect(clock(400)).toBe(0);
    expect(clock(416)).toBe(16);
  });
});

describe("subscribeFrame", () => {
  beforeEach(() => {
    useFakeFrames();
  });

  afterEach(() => {
    restoreFrameGlobals();
  });

  it("updates sources before painting regardless of subscription order", () => {
    const calls: string[] = [];
    const stopPaint = subscribeFrame(() => calls.push("paint"));
    const stopUpdate = subscribeFrame(() => calls.push("update"), "update");

    try {
      advance(16);
      expect(calls).toEqual(["update", "paint"]);
    } finally {
      stopPaint();
      stopUpdate();
    }
  });

  it("keeps one animation loop when listeners change during a tick", () => {
    const paint = mock();
    let stopPaint: (() => void) | undefined;

    const stopUpdate = subscribeFrame(() => {
      stopUpdate();
      stopPaint = subscribeFrame(paint);
    }, "update");

    try {
      advance(48);
      expect(paint).toHaveBeenCalledTimes(3);
    } finally {
      stopUpdate();
      stopPaint?.();
    }

    advance(32);
    expect(paint).toHaveBeenCalledTimes(3);
  });
});

describe("frame test globals", () => {
  it("leave the frame functions exactly as they were found", () => {
    for (const name of frameGlobals) {
      expect(Object.getOwnPropertyDescriptor(globalThis, name)).toEqual(
        originalDescriptors.get(name)
      );
    }
  });
});
