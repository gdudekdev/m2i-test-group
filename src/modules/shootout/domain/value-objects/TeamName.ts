import { boundedText } from "../../../../shared/domain/boundedText";

export type TeamName = string & { readonly __brand: "TeamName" };

export const TEAM_NAME_MAX_LENGTH = 80;

export const teamName = (value: string): TeamName =>
    boundedText(value, TEAM_NAME_MAX_LENGTH, "Team name") as TeamName;
