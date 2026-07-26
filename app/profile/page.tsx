import { PlayerProfile } from "./player-profile";
import "../account/account.css";
import "./profile.css";

export const metadata = { title: "Player Profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <PlayerProfile />;
}

