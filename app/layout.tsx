import type { Metadata } from "next";
import "./globals.css";
import "./achievements/achievements.css";
import "./leaderboard/leaderboard.css";
import "./leaderboard/roster-inspector.css";
import "./modal-fixes.css";
import "./ranking-form-fixes.css";
import "./account/account-card.css";
import "./achievement-reveal.css";
import "./share-card-modal.css";
import "./account/account-grid-fix.css";

export const metadata: Metadata = {
  title: { default: "Football Arcade", template: "%s — Football Arcade" },
  description: "Three quick football games. Infinite impossible teams.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Football Arcade — Build the impossible",
    description: "Draft legends, chase a perfect season, and build football's next superstar.",
    type: "website",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "Football Arcade — Build the impossible" }],
  },
  twitter: { card: "summary_large_image", title: "Football Arcade", description: "Build the impossible.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
