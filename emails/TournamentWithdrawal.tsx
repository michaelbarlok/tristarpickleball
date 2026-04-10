import { Button, Text } from "@react-email/components";
import BaseEmail from "./BaseEmail";

interface Props {
  tournamentTitle?: string;
  tournamentId?: string;
}

export default function TournamentWithdrawal({ tournamentTitle, tournamentId }: Props) {
  return (
    <BaseEmail
      preview={`Withdrawal confirmed — ${tournamentTitle}`}
      heading="Withdrawal Confirmed"
    >
      <Text style={text}>
        You have been withdrawn from{" "}
        <strong>{tournamentTitle ?? "the tournament"}</strong>. Your spot has been released.
      </Text>
      <Text style={text}>
        If this was a mistake or you'd like to re-register, visit the tournament page while registration is still open.
      </Text>
      <Button
        href={tournamentId ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/tournaments/${tournamentId}` : "#"}
        style={button}
      >
        View Tournament
      </Button>
    </BaseEmail>
  );
}

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const button = {
  backgroundColor: "#14b8a6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
  marginTop: "16px",
};
