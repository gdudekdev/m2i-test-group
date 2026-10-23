import { InvalidValueError } from "./DomainError";

export function boundedText(value: string, maxLength: number, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > maxLength) {
        throw new InvalidValueError(`${label} must contain 1 to ${maxLength} characters.`);
    }
    return trimmed;
}
