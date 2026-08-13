type BindingRequest = {
  email: string;
  productId: string;
  accountNumber: string;
};

type BindingResponse = {
  account_number: string;
  replaced_account?: string | null;
  expiry?: string;
};

function requiredMasterServerConfig() {
  const baseUrl = process.env.MASTER_SERVER_BASE_URL?.trim().replace(/\/+$/, "");
  const syncKey = process.env.MASTER_SERVER_SYNC_KEY?.trim();
  if (!baseUrl?.startsWith("https://") || !syncKey) {
    throw new Error("MT5 licence synchronisation is not configured. Please contact FizuxCoder support.");
  }
  return { baseUrl, syncKey };
}

export function getMasterServerPaymentCallbackUrl() {
  const { baseUrl } = requiredMasterServerConfig();
  return `${baseUrl}/payment_success`;
}

function messageFromPayload(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }
  return null;
}

export async function bindMasterServerLicence(input: BindingRequest): Promise<BindingResponse> {
  const { baseUrl, syncKey } = requiredMasterServerConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/license/bind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Sync-Key": syncKey,
      },
      body: JSON.stringify({
        email: input.email,
        product_id: input.productId,
        account_number: input.accountNumber,
      }),
    });
  } catch {
    throw new Error("The MT5 licence service is temporarily unreachable. Please try again shortly.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(messageFromPayload(payload) ?? "The MT5 licence service rejected this account binding.");
  }
  if (!payload || typeof payload !== "object" || !("account_number" in payload) || typeof payload.account_number !== "string") {
    throw new Error("The MT5 licence service returned an invalid binding response.");
  }
  return payload as BindingResponse;
}
