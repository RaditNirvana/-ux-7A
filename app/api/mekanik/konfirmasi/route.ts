import { apiErrorResponse, forbiddenResponse, getMekanikIdentity } from "@/lib/mekanik-api";
import { getMekanikConfirmationData } from "@/lib/mekanik-confirmation-data";

export async function GET() {
  try {
    const identity = await getMekanikIdentity();
    if (!identity) return forbiddenResponse();
    return Response.json(await getMekanikConfirmationData(identity.id_mekanik));
  } catch (error) {
    return apiErrorResponse(error, "Status persetujuan servis belum dapat dimuat.");
  }
}
