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
  description: "Era XI is live in Football Arcade Early Access: draft across eras, rewrite a historic league season, and share the result.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Football Arcade — Build the impossible",
    description: "Draft across eras, rewrite a historic league season, and share the result in Football Arcade Early Access.",
    type: "website",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "Football Arcade — Build the impossible" }],
  },
  twitter: { card: "summary_large_image", title: "Football Arcade", description: "Era XI is live in Early Access.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
