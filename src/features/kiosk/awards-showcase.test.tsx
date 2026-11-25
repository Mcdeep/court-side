// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { AwardsShowcase, type Award } from "./awards-showcase";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const award = (id: string, title: string, winner: string): Award => ({
  id,
  title,
  emoji: "⭐",
  winners: [winner],
  detail: `${title} detail`,
  short: title,
});

const featuredTitle = () => screen.getByTestId("featured-award").getAttribute("data-award");
const currentInStrip = () =>
  screen.getAllByRole("listitem").find((el) => el.getAttribute("aria-current") === "true")?.dataset
    .award;

test("rotates the featured award", () => {
  vi.useFakeTimers();
  render(
    <AwardsShowcase
      awards={[
        award("onFire", "On Fire", "Alex"),
        award("clutch", "Clutch", "Sam"),
        award("warrior", "Warrior", "Jo"),
      ]}
    />,
  );
  expect(featuredTitle()).toBe("onFire");
  expect(currentInStrip()).toBe("onFire");
  act(() => vi.advanceTimersByTime(8000));
  expect(featuredTitle()).toBe("clutch");
  expect(currentInStrip()).toBe("clutch");
  act(() => vi.advanceTimersByTime(16000));
  expect(featuredTitle()).toBe("onFire");
});

test("one or two awards show without rotation", () => {
  render(
    <AwardsShowcase
      awards={[award("onFire", "On Fire", "Alex"), award("clutch", "Clutch", "Sam")]}
    />,
  );
  expect(screen.getByText("On Fire detail")).toBeTruthy();
  expect(screen.getByText("Clutch detail")).toBeTruthy();
  expect(screen.queryByTestId("featured-award")).toBeNull();
  expect(document.querySelector("[aria-current]")).toBeNull();
});

test("no awards shows a thank-you", () => {
  render(<AwardsShowcase awards={[]} />);
  expect(screen.getByText("Thanks for playing!")).toBeTruthy();
});
