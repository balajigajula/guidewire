import type { Claim, FraudFlag, User } from "./types";

export function detectFraud(args: {
  claim: Claim;
  user: User;
  recentClaimsForUser: Claim[];
}): FraudFlag[] {
  const flags: FraudFlag[] = [];

  // Weather mismatch fraud: we expect a weather snapshot for every claim.
  if (!args.claim.weatherSnapshot) {
    flags.push("NO_WEATHER_MATCH");
  }

  // Multiple claims in short time.
  const last = args.recentClaimsForUser[0];
  if (last) {
    const minutes = (args.claim.createdAt - last.createdAt) / 60_000;
    if (minutes >= 0 && minutes <= 15) {
      flags.push("MULTIPLE_CLAIMS_SHORT_WINDOW");
    }
  }

  // Location mismatch.
  const userCity = args.user.profile?.city?.trim();
  const weatherCity = args.claim.weatherSnapshot?.city?.trim();
  if (userCity && weatherCity && userCity !== weatherCity) {
    flags.push("LOCATION_MISMATCH");
  }

  // De-dup (defensive).
  return Array.from(new Set(flags));
}

