"use server";

import { createPasswordResetOtp, verifyPasswordResetOtp } from "@/lib/auth/password-reset-otp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findProfileByUsernameAndEmail,
  getProfileById,
  resetProfilePassword,
  updateProfile,
} from "@/lib/auth/profile";
import { sendPasswordResetOtpEmail } from "@/lib/email/send-otp-email";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type ProfileActionState = {
  error?: string;
  success?: string;
  otpSent?: boolean;
  /** Shown only in local development when email could not be sent */
  devOtp?: string;
  devOtpReason?: string;
};

export async function updateProfileAction(
  _prev: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const username = (formData.get("username") as string) ?? "";
  const fullName = (formData.get("fullName") as string | null)?.trim() || null;
  const email = (formData.get("email") as string) ?? "";

  const result = await updateProfile(session.profileId, {
    username,
    fullName,
    email,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Profile updated." };
}

export async function requestPasswordResetOtpAction(
  _prev: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState | null> {
  const username = (formData.get("username") as string).trim();
  const email = (formData.get("email") as string).trim();

  if (!username || !email) {
    return { error: "Username and recovery email are required." };
  }

  try {
    const profile = await findProfileByUsernameAndEmail(username, email);
    if (!profile) {
      return {
        error: "No account found with that username and recovery email.",
      };
    }

    if (!profile.email) {
      return { error: "This account has no recovery email on file." };
    }

    const otpResult = await createPasswordResetOtp(profile.id);
    if ("error" in otpResult && otpResult.error) {
      return { error: otpResult.error };
    }

    if (!("code" in otpResult) || !otpResult.code) {
      return { error: "Failed to generate reset code." };
    }

    const emailResult = await sendPasswordResetOtpEmail(
      profile.email,
      profile.username,
      otpResult.code
    );

    if ("error" in emailResult && emailResult.error) {
      const supabase = createAdminClient();
      await supabase
        .from("password_reset_otps")
        .delete()
        .eq("profile_id", profile.id)
        .is("used_at", null);
      return { error: emailResult.error };
    }

    const devOtp =
      "devDelivery" in emailResult && emailResult.devDelivery
        ? otpResult.code
        : undefined;
    const devOtpReason =
      "devDeliveryReason" in emailResult
        ? emailResult.devDeliveryReason
        : undefined;

    return {
      success: devOtp
        ? "Email could not be sent locally, so your reset code is shown below."
        : "A 6-digit code was sent to your recovery email. It expires in 10 minutes.",
      otpSent: true,
      devOtp,
      devOtpReason,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to send reset code right now. Please try again.",
    };
  }

}

export async function resetPasswordWithOtpAction(
  _prev: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState | null> {
  const username = (formData.get("username") as string).trim();
  const email = (formData.get("email") as string).trim();
  const otp = (formData.get("otp") as string).trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!username || !email || !otp) {
    return { error: "Username, email, and OTP code are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  try {
    const profile = await findProfileByUsernameAndEmail(username, email);
    if (!profile) {
      return {
        error: "No account found with that username and recovery email.",
      };
    }

    const otpResult = await verifyPasswordResetOtp(profile.id, otp);
    if ("error" in otpResult && otpResult.error) {
      return { error: otpResult.error };
    }

    const result = await resetProfilePassword(profile.id, password);
    if ("error" in result && result.error) {
      return { error: result.error };
    }
  } catch {
    return { error: "Unable to reset password right now. Please try again." };
  }

  return { success: "Password updated. You can sign in with your new password." };
}

export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return getProfileById(session.profileId);
}
