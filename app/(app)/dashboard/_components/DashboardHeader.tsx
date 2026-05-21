import ShareCardButton from "@/components/dashboard/ShareCardButton";
import { BE } from "@/lib/theme";

interface Props {
  userId: string;
  firstName: string;
}

export default function DashboardHeader({ userId, firstName }: Props) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }} className="db-hdr">
      <div>
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Progress · Personal Dashboard
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, margin: 0, fontFamily: BE.serif, color: BE.text }} className="db-h1">
          {greeting}, {firstName}.
        </h1>
      </div>
      <ShareCardButton userId={userId} />
    </div>
  );
}
