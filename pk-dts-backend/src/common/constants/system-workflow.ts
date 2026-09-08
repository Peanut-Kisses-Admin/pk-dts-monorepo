export function systemWorkflowKey(documentType: string, action?: string) {
  return documentType === "HARDCOPY" ? "system-hardcopy-direct-approval"
    : action === "CANCELLATION" ? "system-softcopy-cancellation" : "system-softcopy-standard";
}
