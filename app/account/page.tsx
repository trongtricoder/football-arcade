import { AccountCenter } from "./account-center";
import "./account.css";

export const metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountCenter />;
}

