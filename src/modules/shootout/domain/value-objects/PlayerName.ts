import { boundedText } from "../../../../shared/domain/boundedText";

export type PlayerName = string & { readonly __brand: "PlayerName" };

export const PLAYER_NAME_MAX_LENGTH = 60;

export const playerName = (value: string): PlayerName =>
    boundedText(value, PLAYER_NAME_MAX_LENGTH, "Player name") as PlayerName;
