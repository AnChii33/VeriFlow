export interface LegalFlag {
    id: string;
    issue: string;
    cfr_section: string;
    status: "pending" | "confirmed" | "ignored";
}

export interface RedraftedTemplate {
    id: string;
    text: string;
    status: "accepted" | "ignored"
}