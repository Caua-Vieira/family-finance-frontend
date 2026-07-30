export interface Card {
    id: number;
    name: string;
    householdId: string;
    ownerUserId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCardPayload {
    name: string;
    ownerUserId: string;
}