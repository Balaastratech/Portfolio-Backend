/** Subject + budget rules for the enquiry email to the admin (kept apart from the Resend client so tests can import it). */
const NO_BUDGET = new Set(['', 'not asked', 'n/a']);

/** One header-safe line: control characters (CR/LF included) become spaces. */
const oneLine = (s: string): string => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();

export function enquirySubject(data: { name: string; projectType: string }): string {
    return `New enquiry: ${oneLine(data.name)} - ${oneLine(data.projectType)}`;
}

/** The budget text, or null when the visitor was never asked / gave none. */
export function realBudget(budget: string | undefined | null): string | null {
    const b = (budget ?? '').trim();
    return NO_BUDGET.has(b.toLowerCase()) ? null : b;
}
