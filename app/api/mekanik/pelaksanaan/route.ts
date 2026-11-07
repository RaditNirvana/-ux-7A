import { apiErrorResponse, forbiddenResponse, getMekanikIdentity } from "@/lib/mekanik-api";
import { getMekanikExecutionData } from "@/lib/mekanik-execution-data";

export async function GET() {
  try {
    const identity = await getMekanikIdentity();
    if (!identity) return forbiddenResponse();
    return Response.json(await getMekanikExecutionData(identity.id_mekanik));
  } catch (error) {
    return apiErrorResponse(error, "Data pelaksanaan servis belum dapat dimuat.");
  }
}
