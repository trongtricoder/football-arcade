import type { Metadata } from "next";
import { FootballArcade } from "./football-arcade";
import { ShareCardHost } from "./share-card-modal";
import { SaveErrorHost } from "./save-error-host";

export const metadata: Metadata = {
  title: "Football Arcade — Build the impossible",
  description: "Draft legends, chase a perfect season, and build football's next superstar.",
};

export default function Home() {
  return <><ShareCardHost/><SaveErrorHost/><FootballArcade /></>;
}
