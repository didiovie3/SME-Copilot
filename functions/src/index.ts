import {setGlobalOptions} from "firebase-functions";
import {onCall, CallableRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import axios, {AxiosError} from "axios";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({maxInstances: 10});

interface PremblyTINResponse {
  data?: {
    taxpayer_name?: string;
    name?: string;
  };
  message?: string;
  status?: boolean;
}

interface PremblyCACResponse {
  data?: {
    company_name?: string;
    name?: string;
    registration_date?: string;
    company_status?: string;
  };
  message?: string;
  status?: boolean;
}

const premblyApiKey = defineSecret("PREMBLY_API_KEY");
const premblyAppId = defineSecret("PREMBLY_APP_ID");

const TIN_REGEX = /^\d{10}$/;
const CAC_REGEX = /^(RC|BN|IT)\d+$/i;

export const verifyTIN = onCall(
  {secrets: [premblyApiKey, premblyAppId]},
  async (request: CallableRequest<{
    tin: string;
    businessId: string;
  }>) => {
    const {tin, businessId} = request.data;

    if (!tin || !businessId) {
      return {
        verified: false,
        error: "TIN and businessId are required",
      };
    }

    if (!TIN_REGEX.test(tin.trim())) {
      return {
        verified: false,
        error: "Invalid TIN format. Must be exactly 10 digits.",
      };
    }

    try {
      const response = await axios.post<PremblyTINResponse>(
        "https://api.prembly.com/identitypass/verification/tin",
        {tin: tin.trim()},
        {
          headers: {
            "x-api-key": premblyApiKey.value(),
            "app-id": premblyAppId.value(),
            "Content-Type": "application/json",
          },
        }
      );

      const data: PremblyTINResponse = response.data;
      const registeredName =
        data?.data?.taxpayer_name ||
        data?.data?.name ||
        null;

      if (!registeredName) {
        await admin
          .firestore()
          .collection("businesses")
          .doc(businessId)
          .update({
            tinVerified: false,
            tinVerificationError:
              "TIN not found in FIRS records",
          });

        return {
          verified: false,
          error: "TIN not found in FIRS records",
        };
      }

      await admin
        .firestore()
        .collection("businesses")
        .doc(businessId)
        .update({
          tinVerified: true,
          tinVerifiedAt:
            admin.firestore.FieldValue.serverTimestamp(),
          tinRegisteredName: registeredName,
          tinVerificationError: null,
        });

      return {
        verified: true,
        registeredName,
      };
    } catch (error: unknown) {
      let errorMessage = "Verification failed";
      if (error instanceof AxiosError) {
        errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Verification failed";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      try {
        await admin
          .firestore()
          .collection("businesses")
          .doc(businessId)
          .update({
            tinVerified: false,
            tinVerificationError: errorMessage,
          });
      } catch {
        // Firestore update failed — log silently
      }

      return {
        verified: false,
        error: errorMessage,
      };
    }
  }
);

export const verifyCAC = onCall(
  {secrets: [premblyApiKey, premblyAppId]},
  async (request: CallableRequest<{
    cacNumber: string;
    businessId: string;
  }>) => {
    const {cacNumber, businessId} = request.data;

    if (!cacNumber || !businessId) {
      return {
        verified: false,
        error: "CAC number and businessId are required",
      };
    }

    if (!CAC_REGEX.test(cacNumber.trim())) {
      return {
        verified: false,
        error:
          "Invalid CAC format. Must start with " +
          "RC, BN, or IT followed by numbers. " +
          "Example: RC123456",
      };
    }

    try {
      const response = await axios.post<PremblyCACResponse>(
        "https://api.prembly.com/identitypass/verification/cac",
        {rc_number: cacNumber.trim().toUpperCase()},
        {
          headers: {
            "x-api-key": premblyApiKey.value(),
            "app-id": premblyAppId.value(),
            "Content-Type": "application/json",
          },
        }
      );

      const data: PremblyCACResponse = response.data;
      const registeredName =
        data?.data?.company_name ||
        data?.data?.name ||
        null;
      const registrationDate =
        data?.data?.registration_date ||
        null;
      const companyStatus =
        data?.data?.company_status ||
        null;

      if (!registeredName) {
        await admin
          .firestore()
          .collection("businesses")
          .doc(businessId)
          .update({
            cacVerified: false,
            cacVerificationError:
              "CAC number not found in CAC records",
          });

        return {
          verified: false,
          error: "CAC number not found in CAC records",
        };
      }

      await admin
        .firestore()
        .collection("businesses")
        .doc(businessId)
        .update({
          cacVerified: true,
          cacVerifiedAt:
            admin.firestore.FieldValue.serverTimestamp(),
          cacRegisteredName: registeredName,
          cacRegistrationDate: registrationDate,
          cacStatus: companyStatus,
          cacVerificationError: null,
        });

      return {
        verified: true,
        registeredName,
        registrationDate,
        companyStatus,
      };
    } catch (error: unknown) {
      let errorMessage = "Verification failed";
      if (error instanceof AxiosError) {
        errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Verification failed";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      try {
        await admin
          .firestore()
          .collection("businesses")
          .doc(businessId)
          .update({
            cacVerified: false,
            cacVerificationError: errorMessage,
          });
      } catch {
        // Firestore update failed — log silently
      }

      return {
        verified: false,
        error: errorMessage,
      };
    }
  }
);
