import type { Metadata } from "next";
import { FootballArcade } from "./football-arcade";

export const metadata: Metadata = {
  title: "Football Arcade — Build the impossible",
  description: "Draft legends, chase a perfect season, and build football's next superstar.",
};

export default function Home() {
  return <FootballArcade />;
}
