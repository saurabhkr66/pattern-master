import ShareCardButton from "@/components/dashboard/ShareCardButton";
import { BE } from "@/lib/theme";
import Greeting from "./Greeting";

interface Props {
  userId: string;
  firstName: string;
}

export default function DashboardHeader({ userId, firstName }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }} className="db-hdr">
      <div>
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Progress · Personal Dashboard
        </div>
        <Greeting firstName={firstName} />
      </div>
      <ShareCardButton userId={userId} />
    </div>
  );
}
